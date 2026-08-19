import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import { ListAttendanceQuery } from './dto/attendance-query.dto';

@Roles(Role.ADMIN)
@Controller('attendance')
export class AttendanceAdminController {
  constructor(private readonly attendance: AttendanceService) {}

  @Get()
  findAll(
    @CurrentUser('schoolId') schoolId: string | null,
    @Query() query: ListAttendanceQuery,
  ) {
    return this.attendance.adminList(schoolId, query);
  }
}
