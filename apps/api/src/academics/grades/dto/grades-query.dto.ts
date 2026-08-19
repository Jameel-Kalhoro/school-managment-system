import { IsOptional, IsString } from 'class-validator';

export class ListGradesQuery {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;
}
