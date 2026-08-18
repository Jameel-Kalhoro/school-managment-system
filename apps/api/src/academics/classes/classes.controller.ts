import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AssignClassTeacherDto } from './dto/assign-class-teacher.dto';
import { AttachSubjectDto } from './dto/attach-subject.dto';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassesService } from './classes.service';

class ListClassesQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  academicYearId?: string;
}

@Roles(Role.ADMIN)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}

  @Post()
  create(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: CreateClassDto) {
    return this.classes.create(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null, @Query() query: ListClassesQuery) {
    return this.classes.findAll(schoolId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.classes.findOne(schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateClassDto,
  ) {
    return this.classes.update(schoolId, id, dto);
  }

  @Patch(':id/class-teacher')
  assignClassTeacher(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: AssignClassTeacherDto,
  ) {
    return this.classes.assignClassTeacher(schoolId, id, dto.teacherId ?? null);
  }

  @Get(':id/subjects')
  listSubjects(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.classes.listSubjects(schoolId, id);
  }

  @Post(':id/subjects')
  addSubject(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: AttachSubjectDto,
  ) {
    return this.classes.addSubject(schoolId, id, dto);
  }

  @Delete(':id/subjects/:classSubjectId')
  removeSubject(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Param('classSubjectId') classSubjectId: string,
  ) {
    return this.classes.removeSubject(schoolId, id, classSubjectId);
  }

  @Delete(':id')
  remove(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.classes.remove(schoolId, id);
  }
}
