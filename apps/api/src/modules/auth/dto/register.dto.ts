import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @IsEmail({}, { message: i18nValidationMessage('errors.invalidEmail') })
  email: string;

  @IsString()
  @MinLength(8, { message: i18nValidationMessage('errors.weakPassword') })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
