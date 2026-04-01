import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class ListingsFilterDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() countryId?: string;
  @IsOptional() @IsString() cityId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() category?: string; // slug alias
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @Type(() => Number) @IsNumber() priceMin?: number;
  @IsOptional() @Type(() => Number) @IsNumber() priceMax?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lat?: number;
  @IsOptional() @Type(() => Number) @IsNumber() lng?: number;
  @IsOptional() @Type(() => Number) @IsNumber() radiusKm?: number;
  @IsOptional() @Transform(({ value }) => value === 'true') @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @Type(() => Number) @IsNumber() limit?: number;
  @IsOptional() @IsString() listingType?: string;
  @IsOptional() @IsString() sort?: string;
}
