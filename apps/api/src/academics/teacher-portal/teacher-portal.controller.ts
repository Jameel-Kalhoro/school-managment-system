import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateStudentDto } from '../students/dto/create-student.dto';
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

  @Post('classes/:id/students')
  addStudent(
    @CurrentUser('id') userId: string,
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') classId: string,
    @Body() dto: CreateStudentDto,
  ) {
    return this.portal.addStudent(userId, schoolId, classId, dto);
  }
}
