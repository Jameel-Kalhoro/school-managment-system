import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchoolStatus } from '@sms/shared';
import { computeBilling } from '../common/billing/billing.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** The current billing state + where-to-pay details for a school. */
  async status(schoolId: string | null) {
    if (!schoolId) {
      throw new BadRequestException('This account is not associated with a school');
    }
    const school = await this.prisma.school.findFirst({
      where: { id: schoolId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!school) {
      throw new BadRequestException('School not found');
    }

    const state = computeBilling(
      {
        currentPeriodEnd: school.subscription?.currentPeriodEnd ?? null,
        schoolStatus: school.status as SchoolStatus,
        pricePkr: school.subscription?.plan?.pricePkr ?? 0,
      },
      new Date(),
      this.config.get<number>('billing.dueDaysBefore') ?? 5,
    );

    return {
      amountPkr: state.amountPkr,
      dueDate: state.dueDate,
      daysUntilDue: state.daysUntilDue,
      dueSoon: state.dueSoon,
      overdue: state.overdue,
      locked: state.locked,
      status: school.subscription?.status ?? null,
      payTo: {
        easypaisaAccount: this.config.get<string>('billing.easypaisaAccount'),
        easypaisaTitle: this.config.get<string>('billing.easypaisaTitle'),
        whatsappReceipt: this.config.get<string>('billing.whatsappReceipt'),
      },
    };
  }
}
