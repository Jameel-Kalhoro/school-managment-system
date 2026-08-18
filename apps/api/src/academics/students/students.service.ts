import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { mapUnique, requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';

const CLASS_SELECT = {
  class: { select: { id: true, name: true, section: true } },
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string | null, dto: CreateStudentDto) {
    const sid = requireSchool(schoolId);
    if (dto.classId) await this.assertClassInSchool(sid, dto.classId);
    try {
      return await this.prisma.student.create({
        data: {
          schoolId: sid,
          rollNo: dto.rollNo,
          name: dto.name,
          gender: dto.gender,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          classId: dto.classId,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
        },
        include: CLASS_SELECT,
      });
    } catch (err) {
      throw mapUnique(err, 'A student with this roll number already exists');
    }
  }

  async findAll(
    schoolId: string | null,
    query: PaginationQueryDto & { classId?: string },
  ) {
    const sid = requireSchool(schoolId);
    const where: Prisma.StudentWhereInput = {
      schoolId: sid,
      ...(query.classId ? { classId: query.classId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { rollNo: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: CLASS_SELECT,
        ...toSkipTake(query),
        orderBy: { rollNo: 'asc' },
      }),
      this.prisma.student.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const student = await this.prisma.student.findFirst({
      where: { id, schoolId: sid },
      include: CLASS_SELECT,
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(schoolId: string | null, id: string, dto: UpdateStudentDto) {
    const sid = requireSchool(schoolId);
    try {
      const { count } = await this.prisma.student.updateMany({
        where: { id, schoolId: sid },
        data: {
          rollNo: dto.rollNo,
          name: dto.name,
          gender: dto.gender,
          dob: dto.dob ? new Date(dto.dob) : undefined,
          guardianName: dto.guardianName,
          guardianPhone: dto.guardianPhone,
          admissionDate: dto.admissionDate ? new Date(dto.admissionDate) : undefined,
          status: dto.status,
        },
      });
      if (count === 0) throw new NotFoundException('Student not found');
    } catch (err) {
      throw mapUnique(err, 'A student with this roll number already exists');
    }
    return this.findOne(sid, id);
  }

  async assignClass(schoolId: string | null, id: string, classId: string | null) {
    const sid = requireSchool(schoolId);
    if (classId) await this.assertClassInSchool(sid, classId);
    const { count } = await this.prisma.student.updateMany({
      where: { id, schoolId: sid },
      data: { classId: classId ?? null },
    });
    if (count === 0) throw new NotFoundException('Student not found');
    return this.findOne(sid, id);
  }

  async remove(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const { count } = await this.prisma.student.deleteMany({ where: { id, schoolId: sid } });
    if (count === 0) throw new NotFoundException('Student not found');
    return { id, deleted: true };
  }

  private async assertClassInSchool(schoolId: string, classId: string): Promise<void> {
    const cls = await this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId } });
    if (!cls) throw new BadRequestException('Class does not belong to this school');
  }
}
