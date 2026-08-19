import { Controller, Get, Param, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { ListAssignmentsQuery } from './dto/assignments-query.dto';

@Roles(Role.ADMIN)
@Controller('assignments')
export class AssignmentsAdminController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Get()
  findAll(
    @CurrentUser('schoolId') schoolId: string | null,
    @Query() query: ListAssignmentsQuery,
  ) {
    return this.assignments.adminList(schoolId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.assignments.adminFindOne(schoolId, id);
  }
}
