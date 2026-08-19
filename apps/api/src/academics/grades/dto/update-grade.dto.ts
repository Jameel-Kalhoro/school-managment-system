import { ExamType } from '@sms/shared';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/** Editable fields only — student/class/subject are fixed after creation. */
export class UpdateGradeDto {
  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @IsOptional()
  @IsNumber()
  @Min(0)
  marksObtained?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  totalMarks?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
