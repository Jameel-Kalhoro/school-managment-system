import { Role } from '@sms/shared';
import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsEnum(Role)
  role!: Role;

  @IsOptional()
  @IsString()
  phone?: string;
}
