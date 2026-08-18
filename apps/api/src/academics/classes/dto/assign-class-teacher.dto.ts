import { IsOptional, IsString } from 'class-validator';

export class AssignClassTeacherDto {
  /** Teacher id to set as class teacher, or null/omitted to clear. */
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
