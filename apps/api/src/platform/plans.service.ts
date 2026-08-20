import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
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

  /**
   * Deletes a plan. Refused while any school is subscribed to it (its FK would
   * fail anyway) — deactivate the plan instead to retire it.
   */
  async remove(id: string) {
    await this.findOne(id);
    const inUse = await this.prisma.subscription.count({ where: { planId: id } });
    if (inUse > 0) {
      throw new ConflictException(
        `This plan is assigned to ${inUse} school(s); deactivate it instead.`,
      );
    }
    await this.prisma.subscriptionPlan.delete({ where: { id } });
    return { id, deleted: true };
  }
}
