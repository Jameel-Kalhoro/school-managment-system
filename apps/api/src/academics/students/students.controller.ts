import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { CreateStudentDto } from './dto/create-student.dto';
import { ImportStudentsDto } from './dto/import-students.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

class ListStudentsQuery extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  classId?: string;
}

@Roles(Role.ADMIN)
@Controller('students')
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Post()
  create(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: CreateStudentDto) {
    return this.students.create(schoolId, dto);
  }

  // Bulk CSV import — dryRun validates + previews, otherwise commits atomically.
  @Post('import')
  import(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: ImportStudentsDto) {
    return this.students.importStudents(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null, @Query() query: ListStudentsQuery) {
    return this.students.findAll(schoolId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.students.findOne(schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateStudentDto,
  ) {
    return this.students.update(schoolId, id, dto);
  }

  @Patch(':id/class')
  assignClass(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: AssignClassDto,
  ) {
    return this.students.assignClass(schoolId, id, dto.classId ?? null);
  }

  @Delete(':id')
  remove(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.students.remove(schoolId, id);
  }
}
