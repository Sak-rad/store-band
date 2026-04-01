import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.chat.findMany({
      where: { OR: [{ userId }, { provider: { userId } }] },
      include: {
        listing: { select: { id: true, title: true, titleI18n: true, media: { take: 1 } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        user: { select: { id: true, name: true, avatarUrl: true } },
        provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: {
        listing: true,
        user: { select: { id: true, name: true, avatarUrl: true } },
        provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true } },
      },
    });
    if (!chat) throw new NotFoundException();
    return chat;
  }

  async create(dto: CreateChatDto, userId: string) {
    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    return this.prisma.chat.upsert({
      where: {
        userId_providerId_listingId: {
          userId,
          providerId: dto.providerId,
          listingId: dto.listingId ?? null,
        },
      },
      create: {
        userId,
        providerId: dto.providerId,
        listingId: dto.listingId,
        contextType: dto.contextType as any,
        contextId: dto.contextId,
      },
      update: {},
    });
  }

  async getMessages(chatId: string, cursor?: string, limit = 50) {
    const take = Math.min(limit, 100);
    const messages = await this.prisma.message.findMany({
      where: { chatId },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
        replyTo: { select: { id: true, text: true, sender: { select: { name: true } } } },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > take) {
      const next = messages.pop();
      nextCursor = next!.id;
    }
    return { data: messages.reverse(), nextCursor };
  }

  async createMessage(
    senderId: string,
    data: { chatId: string; text: string; replyToMessageId?: string },
  ) {
    const message = await this.prisma.message.create({
      data: {
        chatId: data.chatId,
        senderId,
        text: data.text,
        replyToMessageId: data.replyToMessageId,
        readBy: [senderId],
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    await this.prisma.chat.update({
      where: { id: data.chatId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  async markRead(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return;
    if (message.readBy.includes(userId)) return;
    await this.prisma.message.update({
      where: { id: messageId },
      data: { readBy: { push: userId } },
    });
  }

  async pinMessage(messageId: string) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: true },
    });
  }
}
