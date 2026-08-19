import { IsDateString, IsOptional, IsString } from 'class-validator';

/** Admin school-wide read: both filters optional. */
export class ListAttendanceQuery {
  @IsOptional()
  @IsString()
  classId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

/** Teacher read for a single class: date is required. */
export class TeacherAttendanceQuery {
  @IsDateString()
  date!: string;
}
