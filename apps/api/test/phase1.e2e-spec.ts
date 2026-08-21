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
  let alphaId: string;

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
    alphaId = res.body.user.id;
  });

  it('creates an allowed user and blocks TEACHER/STUDENT/SUPER_ADMIN', async () => {
    // Admin and Parent are the only roles the generic /users endpoint allows.
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Second Admin', email: `a2-${run}@test.local`, role: 'ADMIN' })
      .expect(201);
    // Teachers must be provisioned via /teachers (which creates their profile).
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Teacher Nope', email: `t-${run}@test.local`, role: 'TEACHER' })
      .expect(403);
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Nope', email: `x-${run}@test.local`, role: 'SUPER_ADMIN' })
      .expect(403);
    // STUDENT is no longer a role — students have no login, only parents do.
    await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Kid', email: `kid-${run}@test.local`, role: 'STUDENT' })
      .expect(400);
  });

  it('lists only its own school users (admin + one more)', async () => {
    const res = await request(http).get('/api/users').set(auth(alphaToken)).expect(200);
    expect(res.body.total).toBe(2);
  });

  it('deletes a user, and blocks deleting your own account', async () => {
    const created = await request(http)
      .post('/api/users')
      .set(auth(alphaToken))
      .send({ name: 'Temp Parent', email: `tmp-${run}@test.local`, role: 'PARENT' })
      .expect(201);
    const tmpId = created.body.user.id as string;

    // Self-delete is refused.
    await request(http).delete(`/api/users/${alphaId}`).set(auth(alphaToken)).expect(400);

    // Deleting the temp user succeeds and the list returns to admin + teacher.
    await request(http).delete(`/api/users/${tmpId}`).set(auth(alphaToken)).expect(200);
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

    // Beta admin cannot delete an Alpha user — the delete is auto-scoped, so
    // Alpha's admin id is simply not found in Beta's school.
    await request(http)
      .delete(`/api/users/${alphaId}`)
      .set(auth(betaLogin.body.accessToken))
      .expect(404);

    // Alpha admin cannot reach platform routes; anonymous is unauthorized.
    await request(http).get('/api/platform/schools').set(auth(alphaToken)).expect(403);
    await request(http).get('/api/platform/schools').expect(401);
  });

  it('treats emails case-insensitively (login + uniqueness)', async () => {
    const mixed = `Case.Admin-${run}@Test.Local`;
    const onboarded = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({
        school: { name: 'E2E Case', slug: `e2e-case-${run}` },
        admin: { name: 'Case Admin', email: mixed },
        planId,
      })
      .expect(201);
    createdSchoolIds.push(onboarded.body.school.id);
    // Stored canonicalized to lowercase.
    expect(onboarded.body.admin.email).toBe(mixed.toLowerCase());

    // Login succeeds with any casing of the same address.
    await login(mixed.toLowerCase(), onboarded.body.tempPassword).expect(200);
    const upper = await login(mixed.toUpperCase(), onboarded.body.tempPassword).expect(200);

    // A case-only-different email collides with the existing admin.
    await request(http)
      .post('/api/users')
      .set(auth(upper.body.accessToken))
      .send({ name: 'Dup Admin', email: mixed.toUpperCase(), role: 'ADMIN' })
      .expect(409);
  });

  it('deletes a school (guarded by status + cascades data)', async () => {
    const created = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({
        school: { name: 'E2E DeleteMe', slug: `e2e-del-${run}` },
        admin: { name: 'Del Admin', email: `del-${run}@test.local` },
        planId,
      })
      .expect(201);
    const schoolId = created.body.school.id as string;

    // Active school cannot be deleted.
    await request(http)
      .delete(`/api/platform/schools/${schoolId}`)
      .set(auth(superToken))
      .expect(409);

    // Suspend, then delete succeeds.
    await request(http)
      .patch(`/api/platform/schools/${schoolId}/status`)
      .set(auth(superToken))
      .send({ status: 'SUSPENDED' })
      .expect(200);
    await request(http)
      .delete(`/api/platform/schools/${schoolId}`)
      .set(auth(superToken))
      .expect(200);

    // Gone, and its users were cascade-deleted.
    await request(http)
      .get(`/api/platform/schools/${schoolId}`)
      .set(auth(superToken))
      .expect(404);
    expect(await prisma.user.count({ where: { schoolId } })).toBe(0);
  });

  it('deletes an unused plan but not one in use by a school', async () => {
    // The seed plan is assigned to Alpha/Beta → cannot be deleted.
    await request(http)
      .delete(`/api/platform/plans/${planId}`)
      .set(auth(superToken))
      .expect(409);

    // A fresh, unassigned plan can be deleted.
    const created = await request(http)
      .post('/api/platform/plans')
      .set(auth(superToken))
      .send({ name: `Throwaway ${run}`, pricePkr: 750 })
      .expect(201);
    const throwawayId = created.body.id as string;
    await request(http)
      .delete(`/api/platform/plans/${throwawayId}`)
      .set(auth(superToken))
      .expect(200);
    await request(http)
      .get(`/api/platform/plans/${throwawayId}`)
      .set(auth(superToken))
      .expect(404);
  });
});
