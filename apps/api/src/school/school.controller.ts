import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UpdateSchoolSettingsDto } from './dto/update-school-settings.dto';
import { SchoolService } from './school.service';

@Roles(Role.ADMIN)
@Controller('school')
export class SchoolController {
  constructor(private readonly school: SchoolService) {}

  @Get()
  getOwn(@CurrentUser('schoolId') schoolId: string | null) {
    return this.school.getOwn(schoolId);
  }

  @Patch()
  updateOwn(
    @CurrentUser('schoolId') schoolId: string | null,
    @Body() dto: UpdateSchoolSettingsDto,
  ) {
    return this.school.updateOwn(schoolId, dto);
  }
}
