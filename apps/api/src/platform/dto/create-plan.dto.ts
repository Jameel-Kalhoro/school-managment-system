import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  pricePkr!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStudents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxTeachers?: number;

  @IsOptional()
  @IsObject()
  features?: Record<string, unknown>;
}
