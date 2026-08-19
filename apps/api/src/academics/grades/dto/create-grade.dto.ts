import { ExamType } from '@sms/shared';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateGradeDto {
  @IsString()
  @MinLength(1)
  studentId!: string;

  @IsString()
  @MinLength(1)
  classId!: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsEnum(ExamType)
  examType!: ExamType;

  @IsNumber()
  @Min(0)
  marksObtained!: number;

  @IsNumber()
  @Min(0.01)
  totalMarks!: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
