import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20;

  @IsOptional()
  @IsString()
  search?: string;
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** Translates a pagination query into Prisma skip/take. */
export function toSkipTake(query: PaginationQueryDto): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

/** Wraps a page of rows with pagination metadata. */
export function paginated<T>(
  data: T[],
  total: number,
  query: PaginationQueryDto,
): Paginated<T> {
  return { data, total, page: query.page, pageSize: query.pageSize };
}
