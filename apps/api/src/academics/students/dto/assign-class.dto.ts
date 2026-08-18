import { IsOptional, IsString } from 'class-validator';

export class AssignClassDto {
  /** Target class id, or null/omitted to unassign. */
  @IsOptional()
  @IsString()
  classId?: string | null;
}
