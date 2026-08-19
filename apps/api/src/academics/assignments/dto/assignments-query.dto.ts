import { IsOptional, IsString } from 'class-validator';

export class ListAssignmentsQuery {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsString()
  subjectId?: string;
}
