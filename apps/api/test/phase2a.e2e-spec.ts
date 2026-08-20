import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 2a end-to-end: academic structure over HTTP. Provisions a super admin
 * + plan via raw Prisma, then drives everything else through the API. All rows
 * are namespaced per run and removed in afterAll, so it is safe to re-run.
 */
describe('Phase 2a — Academics structure (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2e2-super-${run}@test.local`;
  const superPass = 'SuperPass123!';
  const createdSchoolIds: string[] = [];
  let planId: string;

  let superToken: string;
  let adminAToken: string;
  let adminBToken: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = (email: string, password: string) =>
    request(http).post('/api/auth/login').send({ email, password });

  async function onboard(name: string, slug: string, adminEmail: string): Promise<string> {
    const res = await request(http)
      .post('/api/platform/schools')
      .set(auth(superToken))
      .send({ school: { name, slug }, admin: { name: `${name} Admin`, email: adminEmail }, planId })
      .expect(201);
    createdSchoolIds.push(res.body.school.id);
    const loginRes = await login(adminEmail, res.body.tempPassword).expect(200);
    return loginRes.body.accessToken as string;
  }

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
        name: 'E2E Super',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(superPass, 10),
      },
    });
    const plan = await prisma.subscriptionPlan.create({ data: { name: `E2E2 Plan ${run}`, pricePkr: 500 } });
    planId = plan.id;

    superToken = (await login(superEmail, superPass).expect(200)).body.accessToken;
    adminAToken = await onboard('E2E2 Alpha', `e2e2-alpha-${run}`, `a-admin-${run}@test.local`);
    adminBToken = await onboard('E2E2 Beta', `e2e2-beta-${run}`, `b-admin-${run}@test.local`);
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

  // shared ids built up across the ordered tests
  const ctx: Record<string, string> = {};
  const teacherEmail = `teacher-${run}@test.local`;
  let teacherTempPassword = '';

  it('admin creates an academic year, subject, class', async () => {
    const ay = await request(http)
      .post('/api/school/academic-years')
      .set(auth(adminAToken))
      .send({ name: '2025-2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true })
      .expect(201);
    ctx.ayId = ay.body.id;

    const subject = await request(http)
      .post('/api/subjects')
      .set(auth(adminAToken))
      .send({ name: 'Mathematics', code: 'MATH' })
      .expect(201);
    ctx.subjectId = subject.body.id;

    const cls = await request(http)
      .post('/api/classes')
      .set(auth(adminAToken))
      .send({ academicYearId: ctx.ayId, name: 'Grade 5', section: 'A' })
      .expect(201);
    ctx.classId = cls.body.id;
  });

  it('admin provisions a teacher (temp password) and maps subject + class teacher', async () => {
    const teacher = await request(http)
      .post('/api/teachers')
      .set(auth(adminAToken))
      .send({ name: 'Ali Teacher', email: teacherEmail, qualification: 'MSc' })
      .expect(201);
    ctx.teacherId = teacher.body.teacher.id;
    teacherTempPassword = teacher.body.tempPassword;
    expect(typeof teacherTempPassword).toBe('string');

    await request(http)
      .post(`/api/classes/${ctx.classId}/subjects`)
      .set(auth(adminAToken))
      .send({ subjectId: ctx.subjectId, teacherId: ctx.teacherId })
      .expect(201);

    await request(http)
      .patch(`/api/classes/${ctx.classId}/class-teacher`)
      .set(auth(adminAToken))
      .send({ teacherId: ctx.teacherId })
      .expect(200);
  });

  it('admin adds a student and assigns them to the class', async () => {
    // Guardian name is required.
    await request(http)
      .post('/api/students')
      .set(auth(adminAToken))
      .send({ rollNo: '001', name: 'No Guardian' })
      .expect(400);

    const student = await request(http)
      .post('/api/students')
      .set(auth(adminAToken))
      .send({ rollNo: '001', name: 'Student One', guardianName: 'Guardian One' })
      .expect(201);
    ctx.studentId = student.body.id;

    await request(http)
      .patch(`/api/students/${ctx.studentId}/class`)
      .set(auth(adminAToken))
      .send({ classId: ctx.classId })
      .expect(200);
  });

  it('teacher sees only their class and its roster', async () => {
    const teacherToken = (await login(teacherEmail, teacherTempPassword).expect(200)).body.accessToken;

    const classes = await request(http).get('/api/teacher/classes').set(auth(teacherToken)).expect(200);
    expect(classes.body).toHaveLength(1);
    expect(classes.body[0].id).toBe(ctx.classId);

    const roster = await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/students`)
      .set(auth(teacherToken))
      .expect(200);
    expect(roster.body).toHaveLength(1);
    expect(roster.body[0].rollNo).toBe('001');
    // Guardian name is threaded into the roster read shape.
    expect(roster.body[0].guardianName).toBe('Guardian One');

    // A class the teacher does NOT teach → forbidden.
    const other = await request(http)
      .post('/api/classes')
      .set(auth(adminAToken))
      .send({ academicYearId: ctx.ayId, name: 'Grade 6', section: 'B' })
      .expect(201);
    await request(http)
      .get(`/api/teacher/classes/${other.body.id}/students`)
      .set(auth(teacherToken))
      .expect(403);

    // Teacher can add a student to their OWN class...
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/students`)
      .set(auth(teacherToken))
      .send({ rollNo: '002', name: 'Added ByTeacher', guardianName: 'Guardian Two' })
      .expect(201);
    const roster2 = await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/students`)
      .set(auth(teacherToken))
      .expect(200);
    expect(roster2.body).toHaveLength(2);
    expect(roster2.body.map((s: { rollNo: string }) => s.rollNo)).toContain('002');

    // ...but NOT to a class they don't teach.
    await request(http)
      .post(`/api/teacher/classes/${other.body.id}/students`)
      .set(auth(teacherToken))
      .send({ rollNo: '003', name: 'Nope', guardianName: 'Guardian Three' })
      .expect(403);

    // Teacher cannot create classes (Admin-only).
    await request(http)
      .post('/api/classes')
      .set(auth(teacherToken))
      .send({ academicYearId: ctx.ayId, name: 'X', section: 'Y' })
      .expect(403);
  });

  it('enforces tenant isolation across schools', async () => {
    const bClasses = await request(http).get('/api/classes').set(auth(adminBToken)).expect(200);
    expect(bClasses.body.total).toBe(0);

    const bSubjects = await request(http).get('/api/subjects').set(auth(adminBToken)).expect(200);
    expect(bSubjects.body.total).toBe(0);
  });

  it('deleting the class-teacher user frees the class', async () => {
    // Resolve the teacher's login id, then delete the user as the admin.
    const teacherLogin = await login(teacherEmail, teacherTempPassword).expect(200);
    const teacherUserId = teacherLogin.body.user.id as string;

    await request(http)
      .delete(`/api/users/${teacherUserId}`)
      .set(auth(adminAToken))
      .expect(200);

    // The class survives but its class-teacher slot is vacated (SetNull).
    const cls = await request(http)
      .get(`/api/classes/${ctx.classId}`)
      .set(auth(adminAToken))
      .expect(200);
    expect(cls.body.classTeacherId).toBeNull();
  });
});
