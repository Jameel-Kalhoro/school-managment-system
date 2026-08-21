import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 3 end-to-end: manual billing. Onboarding sets a monthly period; time is
 * driven deterministically by editing subscription.currentPeriodEnd via raw
 * Prisma to exercise due-soon, hard-lock (402) and record-payment (unlock).
 */
describe('Phase 3 — Manual billing (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2e3-super-${run}@test.local`;
  const superPass = 'SuperPass123!';
  const adminEmail = `e2e3-admin-${run}@test.local`;
  const teacherEmail = `e2e3-teacher-${run}@test.local`;
  const createdSchoolIds: string[] = [];
  let planId: string;
  let schoolId: string;

  let superToken: string;
  let adminToken: string;
  let teacherToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = (email: string, password: string) =>
    request(http).post('/api/auth/login').send({ email, password });

  const setPeriodEnd = (date: Date) =>
    prisma.subscription.update({ where: { schoolId }, data: { currentPeriodEnd: date } });
  const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { enableImplicitConversion: true } }),
    );
    await app.init();
    http = app.getHttpServer();

    await prisma.user.upsert({
      where: { email: superEmail },
      update: {},
      create: {
        email: superEmail,
        name: 'E2E3 Super',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(superPass, 10),
      },
    });
    const plan = await prisma.subscriptionPlan.create({ data: { name: `E2E3 Plan ${run}`, pricePkr: 500 } });
    planId = plan.id;
    superToken = (await login(superEmail, superPass).expect(200)).body.accessToken;

    const onboard = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({ school: { name: 'E2E3 School', slug: `e2e3-${run}` }, admin: { name: 'Admin', email: adminEmail }, planId })
      .expect(201);
    schoolId = onboard.body.school.id;
    createdSchoolIds.push(schoolId);
    adminToken = (await login(adminEmail, onboard.body.tempPassword).expect(200)).body.accessToken;

    // A teacher, to prove non-admin roles are also locked.
    const teacher = await request(http)
      .post('/api/teachers')
      .set(auth(adminToken))
      .send({ name: 'Teacher One', email: teacherEmail })
      .expect(201);
    teacherToken = (await login(teacherEmail, teacher.body.tempPassword).expect(200)).body.accessToken;
  });

  afterAll(async () => {
    if (createdSchoolIds.length) {
      await prisma.school.deleteMany({ where: { id: { in: createdSchoolIds } } });
    }
    await prisma.subscriptionPlan.deleteMany({ where: { id: planId } });
    await prisma.user.deleteMany({ where: { email: superEmail } });
    await app.close();
    await prisma.$disconnect();
  });

  it('fresh school: not due, not locked, exposes pay details', async () => {
    const res = await request(http).get('/api/billing').set(auth(adminToken)).expect(200);
    expect(res.body.locked).toBe(false);
    expect(res.body.dueSoon).toBe(false);
    expect(res.body.amountPkr).toBe(500);
    expect(res.body.payTo.easypaisaAccount).toBe('03476379869');
    expect(res.body.payTo.easypaisaTitle).toBe('Jameel Ahmed');
    expect(res.body.payTo.whatsappReceipt).toBe('03108495112');
    // Tenant route works.
    await request(http).get('/api/subjects').set(auth(adminToken)).expect(200);
  });

  it('within 5 days of due → dueSoon, still usable', async () => {
    await setPeriodEnd(daysFromNow(3));
    const res = await request(http).get('/api/billing').set(auth(adminToken)).expect(200);
    expect(res.body.dueSoon).toBe(true);
    expect(res.body.locked).toBe(false);
    await request(http).get('/api/subjects').set(auth(adminToken)).expect(200);
  });

  it('past due → locked: tenant routes 402, billing + password still allowed', async () => {
    await setPeriodEnd(daysFromNow(-1));
    const res = await request(http).get('/api/billing').set(auth(adminToken)).expect(200);
    expect(res.body.locked).toBe(true);
    expect(res.body.overdue).toBe(true);

    // Every tenant route is locked, for admin and teacher alike.
    await request(http).get('/api/subjects').set(auth(adminToken)).expect(402);
    await request(http).get('/api/teacher/classes').set(auth(teacherToken)).expect(402);

    // Exempt: billing status and change-password still work while locked.
    await request(http).get('/api/billing').set(auth(teacherToken)).expect(200);
    await request(http)
      .patch('/api/auth/password')
      .set(auth(adminToken))
      .send({ currentPassword: 'wrong', newPassword: 'Whatever123!' })
      .expect(400); // reached the handler (bad current pw) — not blocked by billing

    // Super admin is never locked.
    await request(http).get('/api/platform/schools').set(auth(superToken)).expect(200);
  });

  it('super admin records payment → unlocks and advances the period', async () => {
    const before = await prisma.subscription.findUniqueOrThrow({ where: { schoolId } });

    await request(http)
      .post(`/api/platform/schools/${schoolId}/record-payment`)
      .set(auth(superToken))
      .send({})
      .expect(201);

    const after = await prisma.subscription.findUniqueOrThrow({ where: { schoolId } });
    expect(after.currentPeriodEnd!.getTime()).toBeGreaterThan(before.currentPeriodEnd!.getTime());
    expect(after.currentPeriodEnd!.getTime()).toBeGreaterThan(Date.now());
    expect(after.status).toBe('ACTIVE');

    const payments = await prisma.payment.findMany({ where: { schoolId } });
    expect(payments).toHaveLength(1);
    expect(payments[0].amountPkr).toBe(500);

    // Unlocked again.
    const res = await request(http).get('/api/billing').set(auth(adminToken)).expect(200);
    expect(res.body.locked).toBe(false);
    await request(http).get('/api/subjects').set(auth(adminToken)).expect(200);
  });
});
