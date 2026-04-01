import { IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class I18nFieldDto {
  @IsString()
  en: string;

  @IsString()
  ru: string;
}

class I18nFieldOptionalDto {
  @IsOptional()
  @IsString()
  en?: string;

  @IsOptional()
  @IsString()
  ru?: string;
}

export class CreateProviderDto {
  @ValidateNested()
  @Type(() => I18nFieldDto)
  nameI18n: I18nFieldDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => I18nFieldOptionalDto)
  bioI18n?: I18nFieldOptionalDto;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  website?: string;
}
