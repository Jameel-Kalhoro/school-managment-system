import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

/**
 * Academic years belong to a single school. `schoolId` is taken from the
 * authenticated Admin and applied explicitly in every query (belt-and-suspenders
 * on top of the PrismaService tenant scoping), so the model's required schoolId
 * is satisfied and a null-school context (e.g. a super admin) is rejected.
 */
@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string | null, dto: CreateAcademicYearDto) {
    const sid = this.requireSchool(schoolId);
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId: sid },
        data: { isCurrent: false },
      });
    }
    return this.prisma.academicYear.create({
      data: {
        schoolId: sid,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        isCurrent: dto.isCurrent ?? false,
      },
    });
  }

  findAll(schoolId: string | null) {
    const sid = this.requireSchool(schoolId);
    return this.prisma.academicYear.findMany({
      where: { schoolId: sid },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = this.requireSchool(schoolId);
    const year = await this.prisma.academicYear.findFirst({ where: { id, schoolId: sid } });
    if (!year) {
      throw new NotFoundException('Academic year not found');
    }
    return year;
  }

  async update(schoolId: string | null, id: string, dto: UpdateAcademicYearDto) {
    const sid = this.requireSchool(schoolId);
    const data: Prisma.AcademicYearUpdateManyMutationInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.startDate !== undefined) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) data.endDate = new Date(dto.endDate);

    const { count } = await this.prisma.academicYear.updateMany({
      where: { id, schoolId: sid },
      data,
    });
    if (count === 0) {
      throw new NotFoundException('Academic year not found');
    }
    return this.findOne(sid, id);
  }

  async remove(schoolId: string | null, id: string) {
    const sid = this.requireSchool(schoolId);
    const { count } = await this.prisma.academicYear.deleteMany({
      where: { id, schoolId: sid },
    });
    if (count === 0) {
      throw new NotFoundException('Academic year not found');
    }
    return { id, deleted: true };
  }

  /** Marks one academic year current and unsets all others in the school. */
  async setCurrent(schoolId: string | null, id: string) {
    const sid = this.requireSchool(schoolId);
    await this.findOne(sid, id);
    await this.prisma.$transaction([
      this.prisma.academicYear.updateMany({
        where: { schoolId: sid },
        data: { isCurrent: false },
      }),
      this.prisma.academicYear.updateMany({
        where: { id, schoolId: sid },
        data: { isCurrent: true },
      }),
    ]);
    return this.findOne(sid, id);
  }

  private requireSchool(schoolId: string | null): string {
    if (!schoolId) {
      throw new BadRequestException('This account is not associated with a school');
    }
    return schoolId;
  }
}
