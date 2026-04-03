import { IsInt, IsString, IsOptional } from 'class-validator';

export class CreateChatDto {
  @IsInt() providerId: number;
  @IsOptional() @IsInt() listingId?: number;
  @IsOptional() @IsString() contextType?: string;
  @IsOptional() @IsString() contextId?: string;
}
