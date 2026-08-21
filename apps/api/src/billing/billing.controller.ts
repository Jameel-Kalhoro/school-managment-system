import { Controller, Get } from '@nestjs/common';
import { Role } from '@sms/shared';
import { AllowWhenLocked } from '../common/decorators/allow-when-locked.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { BillingService } from './billing.service';

@Roles(Role.ADMIN, Role.TEACHER, Role.PARENT)
@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // Reachable even when the school is locked, so the pay-now screen can render.
  @Get()
  @AllowWhenLocked()
  status(@CurrentUser('schoolId') schoolId: string | null) {
    return this.billing.status(schoolId);
  }
}
