import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class I18nField {
  @IsString()
  en: string;

  @IsString()
  ru: string;
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

  @IsNumber()
  priceMin: number;

  @IsNumber()
  @IsOptional()
  priceMax?: number;

  @IsString()
  currency: string;

  @IsString()
  categoryId: string;

  @IsString()
  cityId: string;

  @IsString()
  countryId: string;

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
  @IsBoolean()
  isPublished?: boolean;
}
