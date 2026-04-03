import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private onlineUsers = new Map<number, string>(); // userId -> socketId

  constructor(
    private chatService: ChatService,
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');
      const payload = this.jwt.verify(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      }) as { sub: string };

      const userId = parseInt(payload.sub, 10);
      client.data.userId = userId;
      this.onlineUsers.set(userId, client.id);
      this.server.emit('user:online', { userId });
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId: number = client.data.userId;
    if (userId) {
      this.onlineUsers.delete(userId);
      this.server.emit('user:offline', { userId });
    }
  }

  @SubscribeMessage('chat:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
    client.join(`chat:${chatId}`);
  }

  @SubscribeMessage('chat:leave')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
    client.leave(`chat:${chatId}`);
  }

  @SubscribeMessage('message:send')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number; text: string; replyToMessageId?: number },
  ) {
    const userId: number = client.data.userId;
    const message = await this.chatService.createMessage(userId, data);
    this.server.to(`chat:${data.chatId}`).emit('message:new', message);
    return message;
  }

  @SubscribeMessage('message:read')
  async handleRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: number; messageId: number },
  ) {
    const userId: number = client.data.userId;
    await this.chatService.markRead(data.messageId, userId);
    this.server
      .to(`chat:${data.chatId}`)
      .emit('message:read', { messageId: data.messageId, userId });
  }

  @SubscribeMessage('typing:start')
  handleTypingStart(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
    client.to(`chat:${chatId}`).emit('typing:indicator', {
      userId: client.data.userId,
      chatId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typing:stop')
  handleTypingStop(@ConnectedSocket() client: Socket, @MessageBody() chatId: number) {
    client.to(`chat:${chatId}`).emit('typing:indicator', {
      userId: client.data.userId,
      chatId,
      isTyping: false,
    });
  }

  sendNotification(userId: number, event: string, payload: any) {
    const socketId = this.onlineUsers.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, payload);
    }
  }
}
