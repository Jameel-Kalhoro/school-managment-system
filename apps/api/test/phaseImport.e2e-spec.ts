import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma, Role, UserStatus } from '@sms/database';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * CSV student-import end-to-end. Verifies dry-run validation (no writes),
 * atomic commit with auto-created classes, all-or-nothing rollback on a bad
 * row, and create-only behaviour for existing roll numbers.
 */
describe('Student CSV import (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<INestApplication['getHttpServer']>;

  const run = Date.now().toString(36);
  const superEmail = `e2eimp-super-${run}@test.local`;
  const superPass = 'SuperPass123!';
  const createdSchoolIds: string[] = [];
  let planId: string;
  let adminToken: string;
  let ayId: string;

  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  const login = (email: string, password: string) =>
    request(http).post('/api/auth/login').send({ email, password });

  const importReq = (body: object) =>
    request(http).post('/api/students/import').set(auth(adminToken)).send(body);
  const studentCount = async (): Promise<number> =>
    (await request(http).get('/api/students').set(auth(adminToken)).expect(200)).body.total;
  const classNames = async (): Promise<string[]> =>
    (await request(http).get('/api/classes').set(auth(adminToken)).expect(200)).body.data.map(
      (c: { name: string; section: string | null }) => `${c.name}-${c.section ?? ''}`,
    );

  async function onboard(name: string, slug: string, adminEmail: string): Promise<string> {
    const res = await request(http)
      .post('/api/platform/schools')
      .set(auth((await login(superEmail, superPass).expect(200)).body.accessToken))
      .send({ school: { name, slug }, admin: { name: `${name} Admin`, email: adminEmail }, planId })
      .expect(201);
    createdSchoolIds.push(res.body.school.id);
    return (await login(adminEmail, res.body.tempPassword).expect(200)).body.accessToken as string;
  }

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
      },
    });
    planId = (await prisma.subscriptionPlan.create({ data: { name: `Imp Plan ${run}`, pricePkr: 500 } }))
      .id;

    adminToken = await onboard('Imp School', `imp-${run}`, `imp-admin-${run}@test.local`);
    ayId = (
      await request(http)
        .post('/api/school/academic-years')
        .set(auth(adminToken))
        .send({ name: '2025-2026', startDate: '2025-08-01', endDate: '2026-06-30', isCurrent: true })
        .expect(201)
    ).body.id;
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

  it('dry-run reports row/column errors and writes nothing', async () => {
    const res = await importReq({
      academicYearId: ayId,
      dryRun: true,
      rows: [
        { rollNo: '001', name: 'Ali Khan', guardianName: 'Guardian A', className: 'Grade 5', section: 'A' },
        { rollNo: '002', name: 'No Guardian', className: 'Grade 5', section: 'A' }, // missing guardianName
        { rollNo: '003', name: 'Bad Gender', guardianName: 'Guardian C', className: 'Grade 6', gender: 'unknown' },
      ],
    });
    expect(res.body.valid).toBe(false);
    const cols = res.body.errors.map((e: { column: string }) => e.column);
    expect(cols).toContain('guardianName');
    expect(cols).toContain('gender');
    // Row numbers are 1-based including the header line: row 3 = the 2nd data row.
    const guardianErr = res.body.errors.find((e: { column: string }) => e.column === 'guardianName');
    expect(guardianErr.row).toBe(3);

    expect(await studentCount()).toBe(0);
  });

  it('dry-run previews a valid file and lists the new classes', async () => {
    const res = await importReq({
      academicYearId: ayId,
      dryRun: true,
      rows: [
        { rollNo: '010', name: 'Sara Ali', guardianName: 'Guardian One', className: 'Grade 5', section: 'A' },
        { rollNo: '011', name: 'Bilal Khan', guardianName: 'Guardian Two', className: 'Grade 6', section: 'B' },
      ],
    });
    expect(res.body.valid).toBe(true);
    expect(res.body.summary.studentsToCreate).toBe(2);
    expect(res.body.summary.newClassesToCreate).toHaveLength(2);
    expect(await studentCount()).toBe(0); // still no writes
  });

  it('commit imports students and auto-creates their classes', async () => {
    const res = await importReq({
      academicYearId: ayId,
      rows: [
        { rollNo: '010', name: 'Sara Ali', guardianName: 'Guardian One', guardianPhone: '03001234567', className: 'Grade 5', section: 'A', gender: 'female' },
        { rollNo: '011', name: 'Bilal Khan', guardianName: 'Guardian Two', className: 'Grade 6', section: 'B' },
      ],
    }).expect(201);
    expect(res.body.importedStudents).toBe(2);
    expect(res.body.createdClasses).toBe(2);

    expect(await studentCount()).toBe(2);
    const classes = await classNames();
    expect(classes).toContain('Grade 5-A');
    expect(classes).toContain('Grade 6-B');
  });

  it('all-or-nothing: a duplicate roll number rejects the whole file', async () => {
    await importReq({
      academicYearId: ayId,
      rows: [
        { rollNo: '020', name: 'New One', guardianName: 'G', className: 'Grade 7', section: 'C' },
        { rollNo: '021', name: 'New Two', guardianName: 'G', className: 'Grade 7', section: 'C' },
        { rollNo: '020', name: 'Dup', guardianName: 'G', className: 'Grade 7', section: 'C' },
      ],
    }).expect(400);

    expect(await studentCount()).toBe(2); // unchanged
    expect(await classNames()).not.toContain('Grade 7-C'); // class creation rolled back
  });

  it('create-only: an already-existing roll number is an error', async () => {
    const res = await importReq({
      academicYearId: ayId,
      dryRun: true,
      rows: [
        { rollNo: '010', name: 'Sara Ali', guardianName: 'Guardian One', className: 'Grade 5', section: 'A' },
      ],
    });
    expect(res.body.valid).toBe(false);
    expect(res.body.errors[0].column).toBe('rollNo');
    expect(res.body.errors[0].message).toMatch(/already exists/i);
  });
});
