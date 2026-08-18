import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Role } from '@sms/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { ChangeSchoolStatusDto } from './dto/change-school-status.dto';
import { OnboardSchoolDto } from './dto/onboard-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { SchoolsService } from './schools.service';

@Roles(Role.SUPER_ADMIN)
@Controller('platform/schools')
export class SchoolsController {
  constructor(private readonly schools: SchoolsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  onboard(@Body() dto: OnboardSchoolDto) {
    return this.schools.onboard(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.schools.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.schools.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schools.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: ChangeSchoolStatusDto) {
    return this.schools.setStatus(id, dto.status);
  }
}
