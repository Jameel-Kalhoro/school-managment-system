import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateAssignmentDto {
  @IsString()
  @MinLength(1)
  classId!: string;

  @IsString()
  @MinLength(1)
  subjectId!: string;

  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  // plain URL for now — real file upload arrives with the files module
  @IsOptional()
  @IsString()
  attachmentUrl?: string;
}
