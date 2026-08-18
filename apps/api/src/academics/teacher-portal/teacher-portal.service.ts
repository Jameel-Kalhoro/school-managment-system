import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TeacherAccessService } from '../teacher-access/teacher-access.service';

/** Read-only endpoints for a logged-in teacher: their classes and rosters. */
@Injectable()
export class TeacherPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherAccessService,
  ) {}

  async myClasses(userId: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    return this.prisma.schoolClass.findMany({
      where: {
        OR: [
          { classTeacherId: teacher.id },
          { classSubjects: { some: { teacherId: teacher.id } } },
        ],
      },
      include: {
        academicYear: { select: { id: true, name: true, isCurrent: true } },
        _count: { select: { students: true } },
      },
      orderBy: [{ name: 'asc' }, { section: 'asc' }],
    });
  }

  async classRoster(userId: string, classId: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, classId);
    return this.prisma.student.findMany({
      where: { classId },
      select: { id: true, rollNo: true, name: true, gender: true, status: true },
      orderBy: { rollNo: 'asc' },
    });
  }
}
