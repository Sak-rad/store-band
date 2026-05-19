import { IsEmail, IsString, MinLength, MaxLength, IsOptional, Matches } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class RegisterDto {
  @IsEmail({}, { message: i18nValidationMessage('errors.invalidEmail') })
  @MaxLength(254, { message: i18nValidationMessage('errors.maxLength') })
  email: string;

  @IsString()
  @MinLength(8, { message: i18nValidationMessage('errors.weakPassword') })
  @MaxLength(128, { message: i18nValidationMessage('errors.maxLength') })
  @Matches(/[A-Z]/, { message: i18nValidationMessage('errors.passwordNeedsUppercase') })
  @Matches(/[0-9]/, { message: i18nValidationMessage('errors.passwordNeedsDigit') })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: i18nValidationMessage('errors.maxLength') })
  name?: string;
}
