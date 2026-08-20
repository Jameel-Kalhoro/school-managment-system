import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@sms/database';
import { Role, SchoolStatus, SubscriptionStatus } from '@sms/shared';
import { addMonths } from '../common/billing/billing.util';
import { generateTempPassword, hashPassword } from '../common/password.util';
import {
  paginated,
  toSkipTake,
  type PaginationQueryDto,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Onboards a school in a single transaction: creates the School, its
   * Subscription (active, with the first monthly period so the first payment is
   * due in a month), and the first ADMIN user with a generated temp password.
   * Runs as SUPER_ADMIN, so tenant scoping is bypassed and schoolId is set
   * explicitly.
   */
  async onboard(dto: OnboardSchoolDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException('Subscription plan not found');
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    try {
      const result = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const school = await tx.school.create({
          data: {
            name: dto.school.name,
            slug: dto.school.slug,
            address: dto.school.address,
            city: dto.school.city,
            phone: dto.school.phone,
          },
        });

        const now = new Date();
        await tx.subscription.create({
          data: {
            schoolId: school.id,
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: now,
            currentPeriodEnd: addMonths(now, 1),
          },
        });

        const admin = await tx.user.create({
          data: {
            schoolId: school.id,
            role: Role.ADMIN,
            name: dto.admin.name,
            email: dto.admin.email,
            phone: dto.admin.phone,
            passwordHash,
            mustChangePassword: true,
          },
          select: { id: true, name: true, email: true, role: true, schoolId: true },
        });

        return { school, admin };
      });

      return { ...result, tempPassword };
    } catch (err) {
      throw this.mapKnownError(err);
    }
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.SchoolWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.school.findMany({
        where,
        ...toSkipTake(query),
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: { include: { plan: true } },
          _count: { select: { users: true } },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        subscription: { include: { plan: true } },
        payments: { orderBy: { paidAt: 'desc' }, take: 12 },
        _count: { select: { users: true, academicYears: true } },
      },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  async update(id: string, dto: UpdateSchoolDto) {
    await this.findOne(id);
    return this.prisma.school.update({ where: { id }, data: { ...dto } });
  }

  async setStatus(id: string, status: SchoolStatus) {
    await this.findOne(id);
    return this.prisma.school.update({ where: { id }, data: { status } });
  }

  /**
   * Records a manual monthly payment: advances the subscription's paid-through
   * date by a month, marks it ACTIVE, unlocks the school, and logs a Payment.
   * If already ahead of now, extends from the current period end; otherwise
   * from now (a lapsed school pays for a fresh month).
   */
  async recordPayment(id: string, recordedById: string, dto: RecordPaymentDto) {
    const school = await this.findOne(id);
    if (!school.subscription) {
      throw new NotFoundException('School has no subscription');
    }
    const amountPkr = dto.amountPkr ?? school.subscription.plan.pricePkr;
    const now = new Date();
    const currentEnd = school.subscription.currentPeriodEnd;
    const base = currentEnd && currentEnd > now ? currentEnd : now;
    const newEnd = addMonths(base, 1);

    await this.prisma.$transaction([
      this.prisma.subscription.update({
        where: { schoolId: id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          currentPeriodStart: now,
          currentPeriodEnd: newEnd,
        },
      }),
      this.prisma.school.update({ where: { id }, data: { status: SchoolStatus.ACTIVE } }),
      this.prisma.payment.create({
        data: {
          schoolId: id,
          amountPkr,
          periodStart: base,
          periodEnd: newEnd,
          recordedById,
          note: dto.note,
        },
      }),
    ]);

    return this.findOne(id);
  }

  /**
   * Permanently deletes a school and all its data. Only allowed once the school
   * is SUSPENDED or CANCELLED (guards against wiping an active school). Classes
   * and their mappings are removed first so the School cascade doesn't hit the
   * Restrict FK from SchoolClass -> AcademicYear.
   */
  async remove(id: string) {
    const school = await this.findOne(id);
    if (
      school.status !== SchoolStatus.SUSPENDED &&
      school.status !== SchoolStatus.CANCELLED
    ) {
      throw new ConflictException('Suspend or cancel the school before deleting it');
    }

    await this.prisma.$transaction([
      this.prisma.classSubject.deleteMany({ where: { schoolId: id } }),
      this.prisma.schoolClass.deleteMany({ where: { schoolId: id } }),
      this.prisma.school.delete({ where: { id } }),
    ]);

    return { id, deleted: true };
  }

  private mapKnownError(err: unknown): Error {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field';
      return new ConflictException(`A record with this ${target} already exists`);
    }
    return err as Error;
  }
}
