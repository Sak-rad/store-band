import { IsDateString, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsInt() listingId: number;
  @IsDateString() checkIn: string;
  @IsDateString() checkOut: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) guestCount?: number;
  @IsOptional() @IsString() notes?: string;
}
