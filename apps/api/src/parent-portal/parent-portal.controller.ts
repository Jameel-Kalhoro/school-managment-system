import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { ParentPortalService } from './parent-portal.service';

@Roles(Role.PARENT)
@Controller('parent')
export class ParentPortalController {
  constructor(private readonly portal: ParentPortalService) {}

  @Get('children')
  myChildren(@CurrentUser('id') userId: string) {
    return this.portal.myChildren(userId);
  }

  @Get('children/:id/attendance')
  attendance(@CurrentUser('id') userId: string, @Param('id') studentId: string) {
    return this.portal.childAttendance(userId, studentId);
  }

  @Get('children/:id/grades')
  grades(@CurrentUser('id') userId: string, @Param('id') studentId: string) {
    return this.portal.childGrades(userId, studentId);
  }

  @Get('children/:id/assignments')
  assignments(@CurrentUser('id') userId: string, @Param('id') studentId: string) {
    return this.portal.childAssignments(userId, studentId);
  }
}
