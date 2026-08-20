import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * Phase 2b end-to-end: attendance, assignments and grades over HTTP. Provisions
 * a super admin + plan via raw Prisma, then drives everything else through the
 * API. Rows are namespaced per run and removed in afterAll, so it is re-runnable.
 */
describe('Phase 2b — Academics activities (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2e2b-super-${run}@test.local`;
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
        name: 'E2E2b Super',
        role: Role.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        passwordHash: await bcrypt.hash(superPass, 10),
      },
    });
    const plan = await prisma.subscriptionPlan.create({ data: { name: `E2E2b Plan ${run}`, pricePkr: 500 } });
    planId = plan.id;

    superToken = (await login(superEmail, superPass).expect(200)).body.accessToken;
    adminAToken = await onboard('E2E2b Alpha', `e2e2b-alpha-${run}`, `a-admin-${run}@test.local`);
    adminBToken = await onboard('E2E2b Beta', `e2e2b-beta-${run}`, `b-admin-${run}@test.local`);
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
  const teacherEmail = `teacher2b-${run}@test.local`;
  let teacherToken = '';
  const date = '2026-08-19';

  it('admin bootstraps year, subject, class, teacher, student (in the class)', async () => {
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

    // A second class the teacher does NOT teach (for authorization checks).
    const other = await request(http)
      .post('/api/classes')
      .set(auth(adminAToken))
      .send({ academicYearId: ctx.ayId, name: 'Grade 6', section: 'B' })
      .expect(201);
    ctx.otherClassId = other.body.id;

    teacherToken = (await login(teacherEmail, teacher.body.tempPassword).expect(200)).body.accessToken;
  });

  it('teacher marks attendance for their class (idempotent overwrite)', async () => {
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/attendance`)
      .set(auth(teacherToken))
      .send({ date, records: [{ studentId: ctx.studentId, status: 'PRESENT' }] })
      .expect(201);

    const first = await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/attendance`)
      .query({ date })
      .set(auth(teacherToken))
      .expect(200);
    expect(first.body).toHaveLength(1);
    expect(first.body[0].status).toBe('PRESENT');

    // Re-marking the same date overwrites, not appends.
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/attendance`)
      .set(auth(teacherToken))
      .send({ date, records: [{ studentId: ctx.studentId, status: 'ABSENT' }] })
      .expect(201);

    const second = await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/attendance`)
      .query({ date })
      .set(auth(teacherToken))
      .expect(200);
    expect(second.body).toHaveLength(1);
    expect(second.body[0].status).toBe('ABSENT');
  });

  it('teacher creates an assignment and records a grade for their class', async () => {
    const assignment = await request(http)
      .post('/api/teacher/assignments')
      .set(auth(teacherToken))
      .send({ classId: ctx.classId, subjectId: ctx.subjectId, title: 'Homework 1' })
      .expect(201);
    ctx.assignmentId = assignment.body.id;

    const grade = await request(http)
      .post('/api/teacher/grades')
      .set(auth(teacherToken))
      .send({
        studentId: ctx.studentId,
        classId: ctx.classId,
        subjectId: ctx.subjectId,
        examType: 'QUIZ',
        marksObtained: 8,
        totalMarks: 10,
      })
      .expect(201);
    ctx.gradeId = grade.body.id;
  });

  it('rejects teacher writes to a class they do not teach (403)', async () => {
    await request(http)
      .post(`/api/teacher/classes/${ctx.otherClassId}/attendance`)
      .set(auth(teacherToken))
      .send({ date, records: [{ studentId: ctx.studentId, status: 'PRESENT' }] })
      .expect(403);
    await request(http)
      .post('/api/teacher/assignments')
      .set(auth(teacherToken))
      .send({ classId: ctx.otherClassId, subjectId: ctx.subjectId, title: 'Nope' })
      .expect(403);
    await request(http)
      .post('/api/teacher/grades')
      .set(auth(teacherToken))
      .send({
        studentId: ctx.studentId,
        classId: ctx.otherClassId,
        subjectId: ctx.subjectId,
        examType: 'QUIZ',
        marksObtained: 5,
        totalMarks: 10,
      })
      .expect(403);
  });

  it('subject teacher can view roster but not take attendance or add students', async () => {
    // A second teacher who teaches a subject in the class but is NOT the class teacher.
    const subject2 = await request(http)
      .post('/api/subjects')
      .set(auth(adminAToken))
      .send({ name: 'Science', code: 'SCI' })
      .expect(201);
    const subTeacher = await request(http)
      .post('/api/teachers')
      .set(auth(adminAToken))
      .send({ name: 'Sub Teacher', email: `subteacher-${run}@test.local`, qualification: 'BSc' })
      .expect(201);
    await request(http)
      .post(`/api/classes/${ctx.classId}/subjects`)
      .set(auth(adminAToken))
      .send({ subjectId: subject2.body.id, teacherId: subTeacher.body.teacher.id })
      .expect(201);
    const subToken = (
      await login(`subteacher-${run}@test.local`, subTeacher.body.tempPassword).expect(200)
    ).body.accessToken;

    // Can view the roster...
    const roster = await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/students`)
      .set(auth(subToken))
      .expect(200);
    expect(roster.body.length).toBeGreaterThanOrEqual(1);

    // ...but cannot view or take attendance, nor add students (class-teacher only).
    await request(http)
      .get(`/api/teacher/classes/${ctx.classId}/attendance`)
      .query({ date })
      .set(auth(subToken))
      .expect(403);
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/attendance`)
      .set(auth(subToken))
      .send({ date, records: [{ studentId: ctx.studentId, status: 'PRESENT' }] })
      .expect(403);
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/students`)
      .set(auth(subToken))
      .send({ rollNo: '500', name: 'Sub Add', guardianName: 'Guardian Sub' })
      .expect(403);
  });

  it('validates inputs (400)', async () => {
    // Attendance for a student not in the class.
    const outsider = await request(http)
      .post('/api/students')
      .set(auth(adminAToken))
      .send({ rollNo: '999', name: 'Outsider', guardianName: 'Guardian Nine' })
      .expect(201);
    await request(http)
      .post(`/api/teacher/classes/${ctx.classId}/attendance`)
      .set(auth(teacherToken))
      .send({ date, records: [{ studentId: outsider.body.id, status: 'PRESENT' }] })
      .expect(400);

    // Grade with marks exceeding total.
    await request(http)
      .post('/api/teacher/grades')
      .set(auth(teacherToken))
      .send({
        studentId: ctx.studentId,
        classId: ctx.classId,
        subjectId: ctx.subjectId,
        examType: 'QUIZ',
        marksObtained: 12,
        totalMarks: 10,
      })
      .expect(400);
  });

  it('admin reads its school activities; role crossing is blocked', async () => {
    const att = await request(http).get('/api/attendance').set(auth(adminAToken)).expect(200);
    expect(att.body.length).toBeGreaterThanOrEqual(1);
    const asg = await request(http).get('/api/assignments').set(auth(adminAToken)).expect(200);
    expect(asg.body.length).toBe(1);
    const grd = await request(http).get('/api/grades').set(auth(adminAToken)).expect(200);
    expect(grd.body.length).toBe(1);

    // A teacher cannot reach admin routes; an admin cannot reach teacher routes.
    await request(http).get('/api/attendance').set(auth(teacherToken)).expect(403);
    await request(http).get('/api/teacher/assignments').set(auth(adminAToken)).expect(403);
  });

  it('enforces tenant isolation across schools', async () => {
    const att = await request(http).get('/api/attendance').set(auth(adminBToken)).expect(200);
    expect(att.body).toHaveLength(0);
    const asg = await request(http).get('/api/assignments').set(auth(adminBToken)).expect(200);
    expect(asg.body).toHaveLength(0);
    const grd = await request(http).get('/api/grades').set(auth(adminBToken)).expect(200);
    expect(grd.body).toHaveLength(0);
  });
});
