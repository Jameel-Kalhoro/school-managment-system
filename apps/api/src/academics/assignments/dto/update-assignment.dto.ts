import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/** Editable fields only — class/subject are fixed after creation. */
export class UpdateAssignmentDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
