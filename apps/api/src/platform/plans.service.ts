import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@sms/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        pricePkr: dto.pricePkr,
        maxStudents: dto.maxStudents,
        maxTeachers: dto.maxTeachers,
        features: (dto.features ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.SubscriptionPlanWhereInput = query.search
      ? { name: { contains: query.search, mode: 'insensitive' } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        ...toSkipTake(query),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: {
        name: dto.name,
        pricePkr: dto.pricePkr,
        maxStudents: dto.maxStudents,
        maxTeachers: dto.maxTeachers,
        features: (dto.features ?? undefined) as Prisma.InputJsonValue | undefined,
        isActive: dto.isActive,
      },
    });
  }

  async setActive(id: string, isActive: boolean) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({ where: { id }, data: { isActive } });
  }
}
