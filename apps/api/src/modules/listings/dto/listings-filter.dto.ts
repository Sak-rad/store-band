import { IsOptional, IsString, IsNumber, IsBoolean, IsInt } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListingsFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @Type(() => Number) @IsInt() countryId?: number;
  @IsOptional() @Type(() => Number) @IsInt() cityId?: number;
  @IsOptional() @Type(() => Number) @IsInt() categoryId?: number;
  @IsOptional() @IsString() category?: string; // slug alias → resolved to id in search service
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isFeatured?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() cursor?: number;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
  @IsOptional() @IsString() listingType?: string;
  @IsOptional() @IsString() sort?: string;
}
