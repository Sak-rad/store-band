import { IsString, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsString() providerId: string;
  @IsOptional() @IsString() listingId?: string;
  @IsOptional() @IsString() contextType?: string;
  @IsOptional() @IsString() contextId?: string;
}
