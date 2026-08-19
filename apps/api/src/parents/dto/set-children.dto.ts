import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetChildrenDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  studentIds!: string[];
}
