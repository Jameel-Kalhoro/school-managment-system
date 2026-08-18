import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { Role, TeacherStatus } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { TeachersService } from './teachers.service';

class SetTeacherStatusDto {
  @IsEnum(TeacherStatus)
  status!: TeacherStatus;
}

@Roles(Role.ADMIN)
@Controller('teachers')
export class TeachersController {
  constructor(private readonly teachers: TeachersService) {}

  @Post()
  create(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: CreateTeacherDto) {
    return this.teachers.create(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null, @Query() query: PaginationQueryDto) {
    return this.teachers.findAll(schoolId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.teachers.findOne(schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateTeacherDto,
  ) {
    return this.teachers.update(schoolId, id, dto);
  }

  @Patch(':id/status')
  setStatus(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: SetTeacherStatusDto,
  ) {
    return this.teachers.setStatus(schoolId, id, dto.status);
  }
}
