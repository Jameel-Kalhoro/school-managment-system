import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { Role } from '@sms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateParentDto } from './dto/create-parent.dto';
import { SetChildrenDto } from './dto/set-children.dto';
import { ParentsService } from './parents.service';

@Roles(Role.ADMIN)
@Controller('parents')
export class ParentsController {
  constructor(private readonly parents: ParentsService) {}

  @Post()
  create(@CurrentUser('schoolId') schoolId: string | null, @Body() dto: CreateParentDto) {
    return this.parents.create(schoolId, dto);
  }

  @Get()
  findAll(@CurrentUser('schoolId') schoolId: string | null) {
    return this.parents.findAll(schoolId);
  }

  @Get(':id')
  findOne(@CurrentUser('schoolId') schoolId: string | null, @Param('id') id: string) {
    return this.parents.findOne(schoolId, id);
  }

  @Patch(':id/children')
  setChildren(
    @CurrentUser('schoolId') schoolId: string | null,
    @Param('id') id: string,
    @Body() dto: SetChildrenDto,
  ) {
    return this.parents.setChildren(schoolId, id, dto);
  }
}
