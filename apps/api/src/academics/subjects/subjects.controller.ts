import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectsService } from './subjects.service';

@Roles(Role.ADMIN)
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly subjects: SubjectsService) {}

  @Post()
  create(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: CreateSubjectDto) {
    return this.subjects.create(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null, @Query() query: PaginationQueryDto) {
    return this.subjects.findAll(schoolId, query);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.subjects.findOne(schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateSubjectDto,
  ) {
    return this.subjects.update(schoolId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.subjects.remove(schoolId, id);
  }
}
