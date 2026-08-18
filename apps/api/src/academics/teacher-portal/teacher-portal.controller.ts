import { Controller, Get, Param } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { TeacherPortalService } from './teacher-portal.service';

@Roles(Role.TEACHER)
@Controller('teacher')
export class TeacherPortalController {
  constructor(private readonly portal: TeacherPortalService) {}

  @Get('classes')
  myClasses(@CurrentUser('id') userId: string) {
    return this.portal.myClasses(userId);
  }

  @Get('classes/:id/students')
  roster(@CurrentUser('id') userId: string, @Param('id') classId: string) {
    return this.portal.classRoster(userId, classId);
  }
}
