import { Gender } from '@sms/shared';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * One student row from the uploaded CSV. Mirrors CreateStudentDto's rules so
 * validation doesn't drift, but `class` + `section` are plain text here — the
 * import auto-creates the matching class under the selected academic year.
 * `dob`/`admissionDate` are intentionally omitted (not managed via import).
 *
 * NOTE: rows are validated manually in the service (via validateSync) rather
 * than through the global ValidationPipe, so we can collect ALL row/column
 * errors at once instead of failing fast with a generic 400.
 */
export class ImportStudentRowDto {
  @IsString()
  @MinLength(1)
  rollNo!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  // Guardian name is required — every student must have a named guardian.
  @IsString()
  @MinLength(2)
  guardianName!: string;

  @IsOptional()
  @IsString()
  guardianPhone?: string;

  // Maps from the CSV `class` column; a class with this name+section is
  // found-or-created for the chosen academic year.
  @IsString()
  @MinLength(1)
  className!: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;
}

export class ImportStudentsDto {
  @IsString()
  academicYearId!: string;

  // When true, validate + preview only (no writes).
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  // Raw rows — shape is validated per-row in the service so we can report
  // precise { row, column, message } errors all at once.
  @IsArray()
  rows!: Array<Record<string, unknown>>;
}
