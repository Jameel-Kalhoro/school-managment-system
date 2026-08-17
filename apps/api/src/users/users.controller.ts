import { Controller, Get } from '@nestjs/common';
import { Role } from '@sms/shared';
import { Roles } from '../common/decorators/roles.decorator';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // ADMIN (and SUPER_ADMIN implicitly) can list users in scope.
  @Roles(Role.ADMIN)
  @Get()
  findAll() {
    return this.users.findAll();
  }
}
