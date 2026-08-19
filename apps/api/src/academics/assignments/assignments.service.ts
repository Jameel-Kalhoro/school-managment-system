import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { TeacherAccessService } from '../teacher-access/teacher-access.service';
import { ListAssignmentsQuery } from './dto/assignments-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

const DETAIL_SELECT = {
  class: { select: { id: true, name: true, section: true } },
  subject: { select: { id: true, name: true, code: true } },
} satisfies Prisma.AssignmentInclude;

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherAccessService,
  ) {}

  // ─── teacher (scoped to taught classes) ──────────────────────

  async create(userId: string, schoolId: string | null, dto: CreateAssignmentDto) {
    const sid = requireSchool(schoolId);
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, dto.classId);
    await this.assertSubject(sid, dto.subjectId);
    return this.prisma.assignment.create({
      data: {
        schoolId: sid,
        classId: dto.classId,
        subjectId: dto.subjectId,
        teacherId: teacher.id,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
      },
      include: DETAIL_SELECT,
    });
  }

  async teacherList(userId: string, query: ListAssignmentsQuery) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const myClassIds = await this.taughtClassIds(teacher.id);
    return this.prisma.assignment.findMany({
      where: {
        classId: { in: myClassIds, ...(query.classId ? { equals: query.classId } : {}) },
      },
      include: DETAIL_SELECT,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async teacherFindOne(userId: string, id: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id },
      include: DETAIL_SELECT,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.access.assertTeachesClass(teacher.id, assignment.classId);
    return assignment;
  }

  async update(userId: string, id: string, dto: UpdateAssignmentDto) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const existing = await this.prisma.assignment.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.access.assertTeachesClass(teacher.id, existing.classId);
    await this.prisma.assignment.updateMany({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        attachmentUrl: dto.attachmentUrl,
      },
    });
    return this.prisma.assignment.findFirst({ where: { id }, include: DETAIL_SELECT });
  }

  async remove(userId: string, id: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    const existing = await this.prisma.assignment.findFirst({ where: { id } });
    if (!existing) throw new NotFoundException('Assignment not found');
    await this.access.assertTeachesClass(teacher.id, existing.classId);
    await this.prisma.assignment.deleteMany({ where: { id } });
    return { id, deleted: true };
  }

  // ─── admin (school-wide read) ────────────────────────────────

  async adminList(schoolId: string | null, query: ListAssignmentsQuery) {
    requireSchool(schoolId);
    return this.prisma.assignment.findMany({
      where: {
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.subjectId ? { subjectId: query.subjectId } : {}),
      },
      include: DETAIL_SELECT,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async adminFindOne(schoolId: string | null, id: string) {
    requireSchool(schoolId);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id },
      include: DETAIL_SELECT,
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
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

  private async assertSubject(schoolId: string, subjectId: string): Promise<void> {
    const subject = await this.prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!subject) throw new BadRequestException('Subject does not belong to this school');
  }
}
