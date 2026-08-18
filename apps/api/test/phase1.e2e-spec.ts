import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 1 end-to-end: boots the real Nest app and exercises platform + tenancy
 * flows over HTTP. Uses the raw (unscoped) Prisma client only for test-user
 * setup/teardown; everything else goes through the API. All records are
 * namespaced per run and removed in afterAll, so it is safe to re-run.
 */
describe('Phase 1 — Platform & Tenancy (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2e-super-${run}@test.local`;
  const superPass = 'SuperPass123!';
  const alphaEmail = `alpha-${run}@test.local`;
  const betaEmail = `beta-${run}@test.local`;
  const createdSchoolIds: string[] = [];
  let planId: string;

  let superToken: string;
  let alphaToken: string;
  let alphaTemp: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();
    http = app.getHttpServer();

    await prisma.user.upsert({
      where: { email: superEmail },
      update: {},
      create: {
        email: superEmail,
        name: 'E2E Super',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(superPass, 10),
        schoolId: null,
      },
    });
    const plan = await prisma.subscriptionPlan.create({
      data: { name: `E2E Plan ${run}`, pricePkr: 1000 },
    });
    planId = plan.id;
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

  const login = (email: string, password: string) =>
    request(http).post('/api/auth/login').send({ email, password });

  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  it('super admin logs in', async () => {
    const res = await login(superEmail, superPass).expect(200);
    superToken = res.body.accessToken;
    expect(res.body.user.role).toBe('SUPER_ADMIN');
  });

  it('onboards a school and returns a temp password', async () => {
    const res = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({
        school: { name: 'E2E Alpha', slug: `e2e-alpha-${run}`, city: 'Lahore' },
        admin: { name: 'Alpha Admin', email: alphaEmail },
        planId,
      })
      .expect(201);
    alphaTemp = res.body.tempPassword;
    createdSchoolIds.push(res.body.school.id);
    expect(typeof alphaTemp).toBe('string');
    expect(res.body.admin.role).toBe('ADMIN');
  });

  it('admin logs in with the temp password (mustChangePassword)', async () => {
    const res = await login(alphaEmail, alphaTemp).expect(200);
    expect(res.body.user.mustChangePassword).toBe(true);
    alphaToken = res.body.accessToken;
  });

  it('changes password — old rejected, new accepted, flag cleared', async () => {
    await request(http)
      .patch('/api/auth/password')
      .set(auth(alphaToken))
      .send({ currentPassword: alphaTemp, newPassword: 'AlphaNew123!' })
      .expect(204);
    await login(alphaEmail, alphaTemp).expect(401);
    const res = await login(alphaEmail, 'AlphaNew123!').expect(200);
    expect(res.body.user.mustChangePassword).toBe(false);
    alphaToken = res.body.accessToken;
  });

  it('creates a teacher and blocks SUPER_ADMIN creation', async () => {
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Teacher One', email: `t-${run}@test.local`, role: 'TEACHER' })
      .expect(201);
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Nope', email: `x-${run}@test.local`, role: 'SUPER_ADMIN' })
      .expect(403);
  });

  it('lists only its own school users (admin + teacher)', async () => {
    const res = await request(http).get('/api/users').set(auth(alphaToken)).expect(200);
    expect(res.body.total).toBe(2);
  });

  it('manages academic years with exactly one current', async () => {
    const first = await request(http)
      .post('/api/school/academic-years')
      .set(auth(alphaToken))
      .send({ name: '2024-2025', startDate: '2024-08-01', endDate: '2025-06-30' })
      .expect(201);
    await request(http)
      .post('/api/school/academic-years')
      .set(auth(alphaToken))
      .send({ name: '2025-2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true })
      .expect(201);
    await request(http)
      .patch(`/api/school/academic-years/${first.body.id}/set-current`)
      .set(auth(alphaToken))
      .expect(200);
    const list = await request(http)
      .get('/api/school/academic-years')
      .set(auth(alphaToken))
      .expect(200);
    const current = list.body.filter((y: { isCurrent: boolean }) => y.isCurrent);
    expect(current).toHaveLength(1);
    expect(current[0].id).toBe(first.body.id);
  });

  it('enforces tenant isolation and role guards', async () => {
    const beta = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({
        school: { name: 'E2E Beta', slug: `e2e-beta-${run}`, city: 'Multan' },
        admin: { name: 'Beta Admin', email: betaEmail },
        planId,
      })
      .expect(201);
    createdSchoolIds.push(beta.body.school.id);

    const betaLogin = await login(betaEmail, beta.body.tempPassword).expect(200);
    const betaUsers = await request(http)
      .get('/api/users')
      .set(auth(betaLogin.body.accessToken))
      .expect(200);
    expect(betaUsers.body.total).toBe(1);

    // Alpha admin cannot reach platform routes; anonymous is unauthorized.
    await request(http).get('/api/platform/schools').set(auth(alphaToken)).expect(403);
    await request(http).get('/api/platform/schools').expect(401);
  });
});
