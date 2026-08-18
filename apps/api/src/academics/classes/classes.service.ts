import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { mapUnique, requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AttachSubjectDto } from './dto/attach-subject.dto';

const teacherName = {
  select: { id: true, user: { select: { id: true, name: true, email: true } } },
} satisfies Prisma.TeacherDefaultArgs;

const CLASS_INCLUDE = {
  academicYear: { select: { id: true, name: true, isCurrent: true } },
  classTeacher: teacherName,
  _count: { select: { students: true, classSubjects: true } },
} satisfies Prisma.SchoolClassInclude;

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string | null, dto: CreateClassDto) {
    const sid = requireSchool(schoolId);
    await this.assertAcademicYear(sid, dto.academicYearId);
    try {
      return await this.prisma.schoolClass.create({
        data: {
          schoolId: sid,
          academicYearId: dto.academicYearId,
          name: dto.name,
          section: dto.section,
        },
        include: CLASS_INCLUDE,
      });
    } catch (err) {
      throw mapUnique(err, 'A class with this name and section already exists for the year');
    }
  }

  async findAll(
    schoolId: string | null,
    query: PaginationQueryDto & { academicYearId?: string },
  ) {
    const sid = requireSchool(schoolId);
    const where: Prisma.SchoolClassWhereInput = {
      schoolId: sid,
      ...(query.academicYearId ? { academicYearId: query.academicYearId } : {}),
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.schoolClass.findMany({
        where,
        include: CLASS_INCLUDE,
        ...toSkipTake(query),
        orderBy: [{ name: 'asc' }, { section: 'asc' }],
      }),
      this.prisma.schoolClass.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const cls = await this.prisma.schoolClass.findFirst({
      where: { id, schoolId: sid },
      include: {
        ...CLASS_INCLUDE,
        classSubjects: {
          include: { subject: { select: { id: true, name: true, code: true } }, teacher: teacherName },
        },
      },
    });
    if (!cls) throw new NotFoundException('Class not found');
    return cls;
  }

  async update(schoolId: string | null, id: string, dto: UpdateClassDto) {
    const sid = requireSchool(schoolId);
    try {
      const { count } = await this.prisma.schoolClass.updateMany({
        where: { id, schoolId: sid },
        data: { name: dto.name, section: dto.section },
      });
      if (count === 0) throw new NotFoundException('Class not found');
    } catch (err) {
      throw mapUnique(err, 'A class with this name and section already exists for the year');
    }
    return this.findOne(sid, id);
  }

  async remove(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const { count } = await this.prisma.schoolClass.deleteMany({ where: { id, schoolId: sid } });
    if (count === 0) throw new NotFoundException('Class not found');
    return { id, deleted: true };
  }

  async assignClassTeacher(schoolId: string | null, id: string, teacherId: string | null) {
    const sid = requireSchool(schoolId);
    if (teacherId) await this.assertTeacher(sid, teacherId);
    const { count } = await this.prisma.schoolClass.updateMany({
      where: { id, schoolId: sid },
      data: { classTeacherId: teacherId ?? null },
    });
    if (count === 0) throw new NotFoundException('Class not found');
    return this.findOne(sid, id);
  }

  // ─── class ↔ subject ↔ teacher mapping ─────────────────────
  async listSubjects(schoolId: string | null, classId: string) {
    const sid = requireSchool(schoolId);
    await this.assertClass(sid, classId);
    return this.prisma.classSubject.findMany({
      where: { classId, schoolId: sid },
      include: {
        subject: { select: { id: true, name: true, code: true } },
        teacher: teacherName,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addSubject(schoolId: string | null, classId: string, dto: AttachSubjectDto) {
    const sid = requireSchool(schoolId);
    await this.assertClass(sid, classId);
    await this.assertSubject(sid, dto.subjectId);
    if (dto.teacherId) await this.assertTeacher(sid, dto.teacherId);
    try {
      return await this.prisma.classSubject.create({
        data: { schoolId: sid, classId, subjectId: dto.subjectId, teacherId: dto.teacherId ?? null },
        include: {
          subject: { select: { id: true, name: true, code: true } },
          teacher: teacherName,
        },
      });
    } catch (err) {
      throw mapUnique(err, 'This subject is already attached to the class');
    }
  }

  async removeSubject(schoolId: string | null, classId: string, classSubjectId: string) {
    const sid = requireSchool(schoolId);
    const { count } = await this.prisma.classSubject.deleteMany({
      where: { id: classSubjectId, classId, schoolId: sid },
    });
    if (count === 0) throw new NotFoundException('Mapping not found');
    return { id: classSubjectId, deleted: true };
  }

  // ─── validation helpers ────────────────────────────────────
  private async assertAcademicYear(schoolId: string, academicYearId: string): Promise<void> {
    const found = await this.prisma.academicYear.findFirst({
      where: { id: academicYearId, schoolId },
    });
    if (!found) throw new BadRequestException('Academic year does not belong to this school');
  }

  private async assertClass(schoolId: string, classId: string): Promise<void> {
    const found = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
    if (!found) throw new NotFoundException('Class not found');
  }

  private async assertSubject(schoolId: string, subjectId: string): Promise<void> {
    const found = await this.prisma.subject.findFirst({ where: { id: subjectId, schoolId } });
    if (!found) throw new BadRequestException('Subject does not belong to this school');
  }

  private async assertTeacher(schoolId: string, teacherId: string): Promise<void> {
    const found = await this.prisma.teacher.findFirst({ where: { id: teacherId, schoolId } });
    if (!found) throw new BadRequestException('Teacher does not belong to this school');
  }
}
