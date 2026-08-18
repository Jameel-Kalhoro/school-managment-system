import { IsEnum } from 'class-validator';
import { SchoolStatus } from '@sms/shared';

export class ChangeSchoolStatusDto {
  @IsEnum(SchoolStatus)
  status!: SchoolStatus;
}
