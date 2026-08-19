import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import { TeacherAttendanceQuery } from './dto/attendance-query.dto';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Roles(Role.TEACHER)
@Controller('teacher/classes/:id/attendance')
export class AttendanceTeacherController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post()
  mark(
    @CurrentUser('id') userId: string,
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') classId: string,
    @Body() dto: MarkAttendanceDto,
  ) {
    return this.attendance.markClass(userId, schoolId, classId, dto);
  }

  @Get()
  byDate(
    @CurrentUser('id') userId: string,
    @Param('id') classId: string,
    @Query() query: TeacherAttendanceQuery,
  ) {
    return this.attendance.teacherByDate(userId, classId, query.date);
  }
}
