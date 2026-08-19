import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { AssignmentsService } from './assignments.service';
import { ListAssignmentsQuery } from './dto/assignments-query.dto';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';

@Roles(Role.TEACHER)
@Controller('teacher/assignments')
export class AssignmentsTeacherController {
  constructor(private readonly assignments: AssignmentsService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('schoolId') schoolId: string | null,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignments.create(userId, schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: ListAssignmentsQuery) {
    return this.assignments.teacherList(userId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.assignments.teacherFindOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignments.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.assignments.remove(userId, id);
  }
}
