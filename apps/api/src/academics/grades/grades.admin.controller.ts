import { Controller, Get, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ListGradesQuery } from './dto/grades-query.dto';
import { GradesService } from './grades.service';

@Roles(Role.ADMIN)
@Controller('grades')
export class GradesAdminController {
  constructor(private readonly grades: GradesService) {}

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null, @Query() query: ListGradesQuery) {
    return this.grades.adminList(schoolId, query);
  }
}
