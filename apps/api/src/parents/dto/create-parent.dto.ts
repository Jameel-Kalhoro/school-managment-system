import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { NormalizeEmail } from '../../common/decorators/normalize-email.decorator';

export class CreateParentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @NormalizeEmail()
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds!: string[];
}
