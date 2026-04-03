import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateChatDto } from './dto/create-chat.dto';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: number) {
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

  async findOne(id: number) {
    const chat = await this.prisma.chat.findUnique({
      where: { id },
      include: {
        listing: {
          select: {
            id: true, title: true, titleI18n: true,
            priceMin: true, priceOnRequest: true, currency: true,
            media: { take: 1, orderBy: { order: 'asc' } },
          },
        },
        user: { select: { id: true, name: true, avatarUrl: true } },
        provider: { select: { id: true, name: true, nameI18n: true, avatarUrl: true, userId: true } },
      },
    });
    if (!chat) throw new NotFoundException();
    return chat;
  }

  async create(dto: CreateChatDto, userId: number) {
    const provider = await this.prisma.provider.findUnique({ where: { id: dto.providerId } });
    if (!provider) throw new NotFoundException('Provider not found');

    // One chat per user-provider pair — find by userId + providerId only
    const existing = await this.prisma.chat.findFirst({
      where: { userId, providerId: dto.providerId },
    });

    if (existing) {
      // Update context listing if a new one is provided
      if (dto.listingId && existing.listingId !== dto.listingId) {
        return this.prisma.chat.update({
          where: { id: existing.id },
          data: { listingId: dto.listingId },
        });
      }
      return existing;
    }

    return this.prisma.chat.create({
      data: {
        userId,
        providerId: dto.providerId,
        listingId: dto.listingId,
        contextType: dto.contextType as any,
        contextId: dto.contextId,
      },
    });
  }

  async getMessages(chatId: number, cursor?: number, limit?: number) {
    const take = Math.min(Number.isFinite(Number(limit)) ? Number(limit) : 50, 100);
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

    let nextCursor: number | null = null;
    if (messages.length > take) {
      const next = messages.pop();
      nextCursor = next!.id;
    }
    return { data: messages.reverse(), nextCursor };
  }

  async createMessage(
    senderId: number,
    data: { chatId: number; text: string; replyToMessageId?: number },
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

  async markRead(messageId: number, userId: number) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) return;
    if (message.readBy.includes(userId)) return;
    await this.prisma.message.update({
      where: { id: messageId },
      data: { readBy: { push: userId } },
    });
  }

  async pinMessage(messageId: number) {
    return this.prisma.message.update({
      where: { id: messageId },
      data: { isPinned: true },
    });
  }
}
