import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateGradeDto } from './dto/create-grade.dto';
import { ListGradesQuery } from './dto/grades-query.dto';
import { UpdateGradeDto } from './dto/update-grade.dto';
import { GradesService } from './grades.service';

@Roles(Role.TEACHER)
@Controller('teacher/grades')
export class GradesTeacherController {
  constructor(private readonly grades: GradesService) {}

  @Post()
  create(
    @CurrentUser('id') userId: string,
    @CurrentUser('schoolId') schoolId: string | null,
    @Body() dto: CreateGradeDto,
  ) {
    return this.grades.create(userId, schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string, @Query() query: ListGradesQuery) {
    return this.grades.teacherList(userId, query);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateGradeDto,
  ) {
    return this.grades.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.grades.remove(userId, id);
  }
}
