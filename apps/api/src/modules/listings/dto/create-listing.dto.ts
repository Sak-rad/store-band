import { IsString, IsOptional, IsNumber, IsObject, ValidateNested, IsInt, IsBoolean, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

class I18nField {
  @IsString() en: string;
  @IsString() ru: string;
}

export class CreateListingDto {
  @IsObject()
  @ValidateNested()
  @Type(() => I18nField)
  titleI18n: I18nField;

  @IsObject()
  @ValidateNested()
  @Type(() => I18nField)
  descriptionI18n: I18nField;

  @IsOptional()
  @IsBoolean()
  priceOnRequest?: boolean;

  @IsOptional()
  @IsNumber()
  priceMin?: number;

  @IsOptional()
  @IsNumber()
  priceMax?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsInt()
  categoryId: number;

  @IsInt()
  cityId: number;

  @IsInt()
  countryId: number;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  listingType?: string;

  @IsOptional()
  @IsBoolean()
  isShortTermAvailable?: boolean;
}
