import { IsString, IsDateString, IsOptional, IsNumber, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString() listingId: string;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) guestCount?: number;
  @IsOptional() @IsString() notes?: string;
}
