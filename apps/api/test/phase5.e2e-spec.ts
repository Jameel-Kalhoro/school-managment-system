import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 5 end-to-end: parent portal. Provisions a super admin + plan via raw
 * Prisma, then drives onboarding, academics, a parent link, and parent reads
 * over HTTP. Namespaced per run and cleaned up in afterAll.
 */
describe('Phase 5 — Parent portal (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2e5-super-${run}@test.local`;
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
        name: 'E2E5 Super',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(superPass, 10),
      },
    });
    const plan = await prisma.subscriptionPlan.create({ data: { name: `E2E5 Plan ${run}`, pricePkr: 500 } });
    planId = plan.id;

    superToken = (await login(superEmail, superPass).expect(200)).body.accessToken;
    adminAToken = await onboard('E2E5 Alpha', `e2e5-alpha-${run}`, `a-admin-${run}@test.local`);
    adminBToken = await onboard('E2E5 Beta', `e2e5-beta-${run}`, `b-admin-${run}@test.local`);
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

  const ctx: Record<string, string> = {};
  const parentEmail = `parent-${run}@test.local`;
  const teacherEmail = `teacher5-${run}@test.local`;
  let parentToken = '';
  let teacherToken = '';
  const date = '2026-08-19';

  it('admin bootstraps a class, teacher, student with attendance/grade/assignment', async () => {
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

    const teacher = await request(http)
      .post('/api/teachers')
      .set(auth(adminAToken))
      .send({ name: 'Ali Teacher', email: teacherEmail, qualification: 'MSc' })
      .expect(201);
    ctx.teacherId = teacher.body.teacher.id;
    teacherToken = (await login(teacherEmail, teacher.body.tempPassword).expect(200)).body.accessToken;

    await request(http)
      .post(`/api/classes/${ctx.classId}/subjects`)
      .set(auth(adminAToken))
      .send({ subjectId: ctx.subjectId, teacherId: ctx.teacherId })
      .expect(201);

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

    // Seed one of each activity for the child.
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/attendance`)
      .set(auth(teacherToken))
      .send({ date, records: [{ studentId: ctx.studentId, status: 'PRESENT' }] })
      .expect(201);
    await request(http)
      .post('/api/teacher/assignments')
      .set(auth(teacherToken))
      .send({ classId: ctx.classId, subjectId: ctx.subjectId, title: 'Homework 1' })
      .expect(201);
    await request(http)
      .post('/api/teacher/grades')
      .set(auth(teacherToken))
      .send({ studentId: ctx.studentId, classId: ctx.classId, subjectId: ctx.subjectId, examType: 'QUIZ', marksObtained: 8, totalMarks: 10 })
      .expect(201);

    // A second, unlinked student for authorization checks.
    const other = await request(http)
      .post('/api/students')
      .set(auth(adminAToken))
      .send({ rollNo: '002', name: 'Student Two', guardianName: 'Guardian Two' })
      .expect(201);
    ctx.otherStudentId = other.body.id;
  });

  it('admin creates a parent linked to the child', async () => {
    const res = await request(http)
      .post('/api/parents')
      .set(auth(adminAToken))
      .send({ name: 'Parent One', email: parentEmail, studentIds: [ctx.studentId] })
      .expect(201);
    expect(typeof res.body.tempPassword).toBe('string');
    expect(res.body.parent.children).toHaveLength(1);
    parentToken = (await login(parentEmail, res.body.tempPassword).expect(200)).body.accessToken;

    const list = await request(http).get('/api/parents').set(auth(adminAToken)).expect(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].children[0].id).toBe(ctx.studentId);
  });

  it('parent sees their child and its attendance, grades, assignments', async () => {
    const children = await request(http).get('/api/parent/children').set(auth(parentToken)).expect(200);
    expect(children.body).toHaveLength(1);
    expect(children.body[0].id).toBe(ctx.studentId);

    const att = await request(http)
      .get(`/api/parent/children/${ctx.studentId}/attendance`)
      .set(auth(parentToken))
      .expect(200);
    expect(att.body).toHaveLength(1);
    expect(att.body[0].status).toBe('PRESENT');

    const grades = await request(http)
      .get(`/api/parent/children/${ctx.studentId}/grades`)
      .set(auth(parentToken))
      .expect(200);
    expect(grades.body).toHaveLength(1);

    const assignments = await request(http)
      .get(`/api/parent/children/${ctx.studentId}/assignments`)
      .set(auth(parentToken))
      .expect(200);
    expect(assignments.body).toHaveLength(1);
  });

  it('parent cannot read a child they are not linked to (403)', async () => {
    await request(http)
      .get(`/api/parent/children/${ctx.otherStudentId}/grades`)
      .set(auth(parentToken))
      .expect(403);
  });

  it('blocks role crossing between portals', async () => {
    // Parent cannot reach teacher/admin routes.
    await request(http).get('/api/teacher/assignments').set(auth(parentToken)).expect(403);
    await request(http).get('/api/attendance').set(auth(parentToken)).expect(403);
    // Teacher cannot reach the parent portal.
    await request(http).get('/api/parent/children').set(auth(teacherToken)).expect(403);
  });

  it('enforces tenant isolation across schools', async () => {
    const bParents = await request(http).get('/api/parents').set(auth(adminBToken)).expect(200);
    expect(bParents.body).toHaveLength(0);
  });
});
