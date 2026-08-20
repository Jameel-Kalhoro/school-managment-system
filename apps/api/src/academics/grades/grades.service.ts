import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { TeacherAccessService } from '../teacher-access/teacher-access.service';
import { CreateGradeDto } from './dto/create-grade.dto';
import { ListGradesQuery } from './dto/grades-query.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';

const DETAIL_SELECT = {
  student: { select: { id: true, rollNo: true, name: true, guardianName: true } },
  subject: { select: { id: true, name: true, code: true } },
} satisfies Prisma.GradeInclude;

@Injectable()
export class GradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherAccessService,
  ) {}

  // ─── teacher (scoped to taught classes) ──────────────────────

  async create(userId: string, schoolId: string | null, dto: CreateGradeDto) {
    const sid = requireSchool(schoolId);
    assertMarks(dto.marksObtained, dto.totalMarks);
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, dto.classId);
    await this.assertStudentInClass(dto.classId, dto.studentId);
    await this.assertSubject(sid, dto.subjectId);
    return this.prisma.grade.create({
      data: {
        schoolId: sid,
        studentId: dto.studentId,
        classId: dto.classId,
        subjectId: dto.subjectId,
        examType: dto.examType,
        marksObtained: dto.marksObtained,
        totalMarks: dto.totalMarks,
        remarks: dto.remarks,
        recordedById: teacher.id,
      },
      include: DETAIL_SELECT,
    });
  }

  async teacherList(userId: string, query: ListGradesQuery) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const myClassIds = await this.taughtClassIds(teacher.id);
    return this.prisma.grade.findMany({
      where: {
        classId: { in: myClassIds, ...(query.classId ? { equals: query.classId } : {}) },
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
      },
      include: DETAIL_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async update(userId: string, id: string, dto: UpdateGradeDto) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const existing = await this.prisma.grade.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Grade not found');
    await this.access.assertTeachesClass(teacher.id, existing.classId);

    const marksObtained = dto.marksObtained ?? existing.marksObtained;
    const totalMarks = dto.totalMarks ?? existing.totalMarks;
    assertMarks(marksObtained, totalMarks);

    await this.prisma.grade.updateMany({
      where: { id },
      data: {
        examType: dto.examType,
        marksObtained: dto.marksObtained,
        totalMarks: dto.totalMarks,
        remarks: dto.remarks,
      },
    });
    return this.prisma.grade.findFirst({ where: { id }, include: DETAIL_SELECT });
  }

  async remove(userId: string, id: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const existing = await this.prisma.grade.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Grade not found');
    await this.access.assertTeachesClass(teacher.id, existing.classId);
    await this.prisma.grade.deleteMany({ where: { id } });
    return { id, deleted: true };
  }

  // ─── admin (school-wide read) ────────────────────────────────

  async adminList(schoolId: string | null, query: ListGradesQuery) {
    requireSchool(schoolId);
    return this.prisma.grade.findMany({
      where: {
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
        ...(query.studentId ? { studentId: query.studentId } : {}),
      },
      include: DETAIL_SELECT,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  // ─── helpers ─────────────────────────────────────────────────

  private async taughtClassIds(teacherId: string): Promise<string[]> {
    const classes = await this.prisma.schoolClass.findMany({
      where: {
        OR: [{ classTeacherId: teacherId }, { classSubjects: { some: { teacherId } } }],
      },
      select: { id: true },
    });
    return classes.map((c) => c.id);
  }

  private async assertStudentInClass(classId: string, studentId: string): Promise<void> {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, classId } });
    if (!student) throw new BadRequestException('Student is not in this class');
  }

  private async assertSubject(schoolId: string, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!subject) throw new BadRequestException('Subject does not belong to this school');
  }
}

function assertMarks(marksObtained: number, totalMarks: number): void {
  if (marksObtained > totalMarks) {
    throw new BadRequestException('Marks obtained cannot exceed total marks');
  }
}
