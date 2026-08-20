import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Teacher } from '@sms/database';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Class-level authorization for teachers. A teacher may act on a class only if
 * they are its class teacher OR they teach a subject in it (via ClassSubject).
 * Reused by the teacher portal now and by 2b activities (attendance/grades).
 */
@Injectable()
export class TeacherAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolves the Teacher profile for a logged-in TEACHER user. */
  async getTeacherByUserId(userId: string): Promise<Teacher> {
    const teacher = await this.prisma.teacher.findFirst({ where: { userId } });
    if (!teacher) {
      throw new ForbiddenException('No teacher profile is linked to this account');
    }
    return teacher;
  }

  /** Throws unless the teacher teaches (or owns) the given class. */
  async assertTeachesClass(teacherId: string, classId: string): Promise<void> {
    const cls = await this.prisma.schoolClass.findFirst({
      where: {
        id: classId,
        OR: [{ classTeacherId: teacherId }, { classSubjects: { some: { teacherId } } }],
      },
    });
    if (!cls) {
      throw new ForbiddenException('You do not teach this class');
    }
  }

  /**
   * Throws unless the teacher is the *class teacher* of the given class (not
   * merely a subject teacher). Used for attendance and adding students, which
   * are restricted to the class teacher.
   */
  async assertIsClassTeacher(teacherId: string, classId: string): Promise<void> {
    const cls = await this.prisma.schoolClass.findFirst({
      where: { id: classId, classTeacherId: teacherId },
    });
    if (!cls) {
      throw new ForbiddenException('Only the class teacher can do this');
    }
  }
}
