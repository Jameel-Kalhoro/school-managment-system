import { IsOptional, IsString } from 'class-validator';

export class AttachSubjectDto {
  @IsString()
  subjectId!: string;

  /** Teacher who teaches this subject in this class (optional). */
  @IsOptional()
  @IsString()
  teacherId?: string | null;
}
