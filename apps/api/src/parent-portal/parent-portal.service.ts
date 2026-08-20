import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { PrismaService } from '../prisma/prisma.service';
import { ParentAccessService } from './parent-access.service';

const CHILD_SELECT = {
  id: true,
  name: true,
  rollNo: true,
  status: true,
  class: { select: { id: true, name: true, section: true } },
} satisfies Prisma.StudentSelect;

/** Read-only endpoints for a logged-in parent: their children and each child's data. */
@Injectable()
export class ParentPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: ParentAccessService,
  ) {}

  /** The students this parent is a guardian of. */
  async myChildren(parentUserId: string) {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId: parentUserId },
      select: { student: { select: CHILD_SELECT } },
      orderBy: { student: { name: 'asc' } },
    });
    return links.map((l) => l.student);
  }

  async childAttendance(parentUserId: string, studentId: string) {
    await this.access.assertParentOf(parentUserId, studentId);
    return this.prisma.attendance.findMany({
      where: { studentId },
      select: {
        id: true,
        date: true,
        status: true,
        class: { select: { id: true, name: true, section: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async childGrades(parentUserId: string, studentId: string) {
    await this.access.assertParentOf(parentUserId, studentId);
    return this.prisma.grade.findMany({
      where: { studentId },
      select: {
        id: true,
        examType: true,
        marksObtained: true,
        totalMarks: true,
        remarks: true,
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async childAssignments(parentUserId: string, studentId: string) {
    await this.access.assertParentOf(parentUserId, studentId);
    const student = await this.prisma.student.findFirst({
      where: { id: studentId },
      select: { classId: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    if (!student.classId) return [];
    return this.prisma.assignment.findMany({
      where: { classId: student.classId },
      select: {
        id: true,
        title: true,
        description: true,
        dueDate: true,
        attachmentUrl: true,
        subject: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }
}
