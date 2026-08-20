import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Role, SchoolStatus, type AuthUser } from '@sms/shared';
import { computeBilling } from '../billing/billing.util';
import { ALLOW_WHEN_LOCKED_KEY } from '../decorators/allow-when-locked.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Locks a school's tenant routes once its monthly payment is overdue (manual
 * billing). Runs after JwtAuthGuard + RolesGuard. Exempt: @Public / @AllowWhenLocked
 * routes, SUPER_ADMIN, and platform users (no schoolId). A locked school gets a
 * 402 with code SCHOOL_LOCKED, which the web turns into the pay-now lock screen.
 */
@Injectable()
export class BillingGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const exempt = this.reflector.getAllAndOverride<boolean>(
      ALLOW_WHEN_LOCKED_KEY,
      [context.getHandler(), context.getClass()],
    );
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (exempt || isPublic) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    // No principal, platform users and super admins are never billing-locked.
    if (!user || user.role === Role.SUPER_ADMIN || !user.schoolId) {
      return true;
    }

    const school = await this.prisma.school.findFirst({
      where: { id: user.schoolId },
      include: { subscription: { include: { plan: true } } },
    });
    if (!school) {
      return true;
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

    if (state.locked) {
      throw new HttpException(
        { statusCode: HttpStatus.PAYMENT_REQUIRED, code: 'SCHOOL_LOCKED', message: 'Your school has not cleared the monthly payment.' },
        HttpStatus.PAYMENT_REQUIRED,
      );
    }
    return true;
  }
}
