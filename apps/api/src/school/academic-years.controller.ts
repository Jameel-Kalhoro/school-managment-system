import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AcademicYearsService } from './academic-years.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { UpdateAcademicYearDto } from './dto/update-academic-year.dto';

@Roles(Role.ADMIN)
@Controller('school/academic-years')
export class AcademicYearsController {
  constructor(private readonly years: AcademicYearsService) {}

  @Post()
  create(
    @CurrentUser('schoolId') schoolId: string | null,
    @Body() dto: CreateAcademicYearDto,
  ) {
    return this.years.create(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null) {
    return this.years.findAll(schoolId);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.years.findOne(schoolId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: UpdateAcademicYearDto,
  ) {
    return this.years.update(schoolId, id, dto);
  }

  @Patch(':id/set-current')
  setCurrent(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.years.setCurrent(schoolId, id);
  }

  @Delete(':id')
  remove(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.years.remove(schoolId, id);
  }
}
