import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@sms/database';
import { Role, TeacherStatus, UserStatus } from '@sms/shared';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../../common/dto/pagination.dto';
import { generateTempPassword, hashPassword } from '../../common/password.util';
import { mapUnique, requireSchool } from '../../common/school-scope';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';

const TEACHER_INCLUDE = {
  user: { select: { id: true, name: true, email: true, phone: true, status: true } },
} satisfies Prisma.TeacherInclude;

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Provisions a TEACHER login + profile in one transaction and returns a
   * one-time temp password (like Phase 1 onboarding / user creation).
   */
  async create(schoolId: string | null, dto: CreateTeacherDto) {
    const sid = requireSchool(schoolId);
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      const teacher = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.create({
          data: {
            schoolId: sid,
            role: Role.TEACHER,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            passwordHash,
            mustChangePassword: true,
          },
        });
        return tx.teacher.create({
          data: {
            schoolId: sid,
            userId: user.id,
            qualification: dto.qualification,
            phone: dto.phone,
            joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
          },
          include: TEACHER_INCLUDE,
        });
      });
      return { teacher, tempPassword };
    } catch (err) {
      throw mapUnique(err, 'A user with this email already exists');
    }
  }

  async findAll(schoolId: string | null, query: PaginationQueryDto) {
    const sid = requireSchool(schoolId);
    const where: Prisma.TeacherWhereInput = {
      schoolId: sid,
      ...(query.search
        ? {
            user: {
              OR: [
                { name: { contains: query.search, mode: 'insensitive' } },
                { email: { contains: query.search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: TEACHER_INCLUDE,
        ...toSkipTake(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.teacher.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(schoolId: string | null, id: string) {
    const sid = requireSchool(schoolId);
    const teacher = await this.prisma.teacher.findFirst({
      where: { id, schoolId: sid },
      include: TEACHER_INCLUDE,
    });
    if (!teacher) throw new NotFoundException('Teacher not found');
    return teacher;
  }

  async update(schoolId: string | null, id: string, dto: UpdateTeacherDto) {
    const sid = requireSchool(schoolId);
    const { count } = await this.prisma.teacher.updateMany({
      where: { id, schoolId: sid },
      data: {
        qualification: dto.qualification,
        phone: dto.phone,
        joinedAt: dto.joinedAt ? new Date(dto.joinedAt) : undefined,
      },
    });
    if (count === 0) throw new NotFoundException('Teacher not found');
    return this.findOne(sid, id);
  }

  /** Activates/deactivates the teacher and its underlying login account. */
  async setStatus(schoolId: string | null, id: string, status: TeacherStatus) {
    const sid = requireSchool(schoolId);
    const teacher = await this.prisma.teacher.findFirst({ where: { id, schoolId: sid } });
    if (!teacher) throw new NotFoundException('Teacher not found');

    const userStatus =
      status === TeacherStatus.ACTIVE ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    await this.prisma.$transaction([
      this.prisma.teacher.updateMany({ where: { id, schoolId: sid }, data: { status } }),
      this.prisma.user.updateMany({
        where: { id: teacher.userId, schoolId: sid },
        data: { status: userStatus },
      }),
    ]);
    return this.findOne(sid, id);
  }
}
