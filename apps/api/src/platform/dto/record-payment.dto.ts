import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RecordPaymentDto {
  // defaults to the school's plan price when omitted
  @IsOptional()
  @IsInt()
  @Min(0)
  amountPkr?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
