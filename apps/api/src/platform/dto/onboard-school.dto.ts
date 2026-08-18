import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

class SchoolInfoDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

class SchoolAdminDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}

export class OnboardSchoolDto {
  @ValidateNested()
  @Type(() => SchoolInfoDto)
  school!: SchoolInfoDto;

  @ValidateNested()
  @Type(() => SchoolAdminDto)
  admin!: SchoolAdminDto;

  @IsString()
  planId!: string;
}
