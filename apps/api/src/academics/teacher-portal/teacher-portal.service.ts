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
    const classes = await this.prisma.schoolClass.findMany({
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
    // Flag the classes this teacher is the *class teacher* of (vs subject teacher),
    // so the client can gate class-teacher-only actions (attendance, add student).
    return classes.map((c) => ({ ...c, isClassTeacher: c.classTeacherId === teacher.id }));
  }

  async classRoster(userId: string, classId: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, classId);
    // Teachers see the guardian name only — not the phone number (admin-only).
    return this.prisma.student.findMany({
      where: { classId },
      select: {
        id: true,
        rollNo: true,
        name: true,
        gender: true,
        status: true,
        guardianName: true,
      },
      orderBy: { rollNo: 'asc' },
    });
  }

  /**
   * Adds a student to a class. Restricted to the class teacher. classId is
   * forced to the given (already-authorized) class, so it can't be spoofed
   * via the body.
   */
  async addStudent(
    userId: string,
    schoolId: string | null,
    classId: string,
    dto: CreateStudentDto,
  ) {
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertIsClassTeacher(teacher.id, classId);
    return this.students.create(schoolId, { ...dto, classId });
  }
}
