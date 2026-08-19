import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from '../students/dto/create-student.dto';
import { StudentsService } from '../students/students.service';
import { TeacherAccessService } from '../teacher-access/teacher-access.service';

/** Endpoints for a logged-in teacher: their classes, rosters, and adding students. */
@Injectable()
export class TeacherPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherAccessService,
    private readonly students: StudentsService,
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
        classSubjects: {
          select: { id: true, subject: { select: { id: true, name: true, code: true } } },
        },
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

  /**
   * Adds a student to a class the teacher teaches. classId is forced to the
   * given (already-authorized) class, so it can't be spoofed via the body.
   */
  async addStudent(
    userId: string,
    schoolId: string | null,
    classId: string,
    dto: CreateStudentDto,
  ) {
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, classId);
    return this.students.create(schoolId, { ...dto, classId });
  }
}
