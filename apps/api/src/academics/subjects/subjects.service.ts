import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { mapUnique, requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string | null, dto: CreateSubjectDto) {
    const sid = requireSchool(schoolId);
    try {
      return await this.prisma.subject.create({
        data: { schoolId: sid, name: dto.name, code: dto.code },
      });
    } catch (err) {
      throw mapUnique(err, 'A subject with this code already exists');
    }
  }

  async findAll(schoolId: string | null, query: PaginationQueryDto) {
    const sid = requireSchool(schoolId);
    const where: Prisma.SubjectWhereInput = {
      schoolId: sid,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({ where, ...toSkipTake(query), orderBy: { name: 'asc' } }),
      this.prisma.subject.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const subject = await this.prisma.subject.findFirst({ where: { id, schoolId: sid } });
    if (!subject) throw new NotFoundException('Subject not found');
    return subject;
  }

  async update(schoolId: string | null, id: string, dto: UpdateSubjectDto) {
    const sid = requireSchool(schoolId);
    try {
      const { count } = await this.prisma.subject.updateMany({
        where: { id, schoolId: sid },
        data: { name: dto.name, code: dto.code },
      });
      if (count === 0) throw new NotFoundException('Subject not found');
    } catch (err) {
      throw mapUnique(err, 'A subject with this code already exists');
    }
    return this.findOne(sid, id);
  }

  async remove(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const { count } = await this.prisma.subject.deleteMany({ where: { id, schoolId: sid } });
    if (count === 0) throw new NotFoundException('Subject not found');
    return { id, deleted: true };
  }
}
