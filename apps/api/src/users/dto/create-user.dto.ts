import { Role } from '@sms/shared';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}
