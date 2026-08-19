import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { TeacherAccessService } from '../teacher-access/teacher-access.service';
import { ListAttendanceQuery } from './dto/attendance-query.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

const STUDENT_SELECT = {
  student: { select: { id: true, rollNo: true, name: true } },
} satisfies Prisma.AttendanceInclude;

const ADMIN_SELECT = {
  ...STUDENT_SELECT,
  class: { select: { id: true, name: true, section: true } },
} satisfies Prisma.AttendanceInclude;

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: TeacherAccessService,
  ) {}

  /**
   * Marks a whole class for one date. Idempotent: re-posting the same date
   * fully overwrites that day's rows. `upsert` is forbidden on tenant models,
   * so this is a transactional deleteMany + createMany.
   */
  async markClass(
    userId: string,
    schoolId: string | null,
    classId: string,
    dto: MarkAttendanceDto,
  ) {
    const sid = requireSchool(schoolId);
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, classId);

    const studentIds = dto.records.map((r) => r.studentId);
    const uniqueIds = [...new Set(studentIds)];
    if (uniqueIds.length !== studentIds.length) {
      throw new BadRequestException('Duplicate students in attendance records');
    }
    const inClass = await this.prisma.student.findMany({
      where: { classId, id: { in: uniqueIds } },
      select: { id: true },
    });
    if (inClass.length !== uniqueIds.length) {
      throw new BadRequestException('One or more students are not in this class');
    }

    const day = new Date(dto.date);
    await this.prisma.$transaction([
      this.prisma.attendance.deleteMany({ where: { classId, date: day } }),
      this.prisma.attendance.createMany({
        data: dto.records.map((r) => ({
          schoolId: sid,
          classId,
          studentId: r.studentId,
          date: day,
          status: r.status,
          markedById: teacher.id,
        })),
      }),
    ]);

    return this.readClassDate(classId, dto.date);
  }

  /** Teacher read of one class's attendance for a date. */
  async teacherByDate(userId: string, classId: string, date: string) {
    const teacher = await this.access.getTeacherByUserId(userId);
    await this.access.assertTeachesClass(teacher.id, classId);
    return this.readClassDate(classId, date);
  }

  /** Admin school-wide read, optionally filtered by class and/or date. */
  async adminList(schoolId: string | null, query: ListAttendanceQuery) {
    requireSchool(schoolId);
    return this.prisma.attendance.findMany({
      where: {
        ...(query.classId ? { classId: query.classId } : {}),
        ...(query.date ? { date: new Date(query.date) } : {}),
      },
      select: {
        id: true,
        date: true,
        status: true,
        markedById: true,
        ...ADMIN_SELECT,
      },
      orderBy: [{ date: 'desc' }, { student: { rollNo: 'asc' } }],
    });
  }

  private readClassDate(classId: string, date: string) {
    return this.prisma.attendance.findMany({
      where: { classId, date: new Date(date) },
      select: {
        id: true,
        date: true,
        status: true,
        markedById: true,
        ...STUDENT_SELECT,
      },
      orderBy: { student: { rollNo: 'asc' } },
    });
  }
}
