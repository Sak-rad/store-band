import { Controller, Get, Post, Patch, Body, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateChatDto } from './dto/create-chat.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('chats')
  findAll(@CurrentUser('id') userId: number) {
    return this.chatService.findAll(userId);
  }

  @Get('chats/:id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.findOne(id);
  }

  @Post('chats')
  create(@Body() dto: CreateChatDto, @CurrentUser('id') userId: number) {
    return this.chatService.create(dto, userId);
  }

  @Get('chats/:id/messages')
  getMessages(
    @Param('id', ParseIntPipe) chatId: number,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getMessages(chatId, cursor ? parseInt(cursor, 10) : undefined, limit);
  }

  @Post('messages')
  createMessage(@Body() body: any, @CurrentUser('id') userId: number) {
    return this.chatService.createMessage(userId, body);
  }

  @Patch('messages/:id/pin')
  pinMessage(@Param('id', ParseIntPipe) id: number) {
    return this.chatService.pinMessage(id);
  }
}
