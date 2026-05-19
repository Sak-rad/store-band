import { IsEmail, IsString, MaxLength } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class LoginDto {
  @IsEmail({}, { message: i18nValidationMessage('errors.invalidEmail') })
  @MaxLength(254, { message: i18nValidationMessage('errors.maxLength') })
  email: string;

  @IsString()
  @MaxLength(128, { message: i18nValidationMessage('errors.maxLength') })
  password: string;
}
