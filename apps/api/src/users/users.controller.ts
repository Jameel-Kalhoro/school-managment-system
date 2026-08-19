import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IsEnum } from 'class-validator';
import { Role, UserStatus } from '@sms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQuery } from './dto/list-users.query';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

class SetUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  create(
    @CurrentUser('schoolId') schoolId: string | null,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(schoolId, dto);
  }

  @Get()
  findAll(@Query() query: ListUsersQuery) {
    return this.users.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetUserStatusDto) {
    return this.users.setStatus(id, dto.status);
  }

  @Delete(':id')
  remove(@CurrentUser('id') currentUserId: string, @Param('id') id: string) {
    return this.users.remove(currentUserId, id);
  }
}
