import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';

describe('ChatService authorization', () => {
  let service: ChatService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      chat: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      message: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    };
    service = new ChatService(prisma);
  });

  const asMember = () => prisma.chat.findFirst.mockResolvedValue({ id: 1 });
  const asNonMember = () => prisma.chat.findFirst.mockResolvedValue(null);

  describe('findOne', () => {
    it('throws Forbidden for a non-member and never reads the chat', async () => {
      asNonMember();
      await expect(service.findOne(1, 999)).rejects.toThrow(ForbiddenException);
      expect(prisma.chat.findUnique).not.toHaveBeenCalled();
    });

    it('returns the chat for a member', async () => {
      asMember();
      prisma.chat.findUnique.mockResolvedValue({ id: 1, listing: null });
      await expect(service.findOne(1, 7)).resolves.toEqual({ id: 1, listing: null });
    });
  });

  describe('getMessages', () => {
    it('throws Forbidden for a non-member and never queries messages', async () => {
      asNonMember();
      await expect(service.getMessages(1, 999)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.findMany).not.toHaveBeenCalled();
    });
  });

  describe('createMessage', () => {
    it('throws Forbidden when the sender is not a member', async () => {
      asNonMember();
      await expect(
        service.createMessage(999, { chatId: 1, text: 'hi' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.message.create).not.toHaveBeenCalled();
    });

    it('creates a message for a member', async () => {
      asMember();
      prisma.message.create.mockResolvedValue({ id: 10, text: 'hi' });
      prisma.chat.update.mockResolvedValue({});
      await expect(service.createMessage(7, { chatId: 1, text: 'hi' })).resolves.toEqual({
        id: 10,
        text: 'hi',
      });
    });
  });

  describe('markRead', () => {
    it('throws Forbidden when the reader is not a member', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 5, chatId: 1, readBy: [] });
      asNonMember();
      await expect(service.markRead(5, 999)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.update).not.toHaveBeenCalled();
    });
  });

  describe('pinMessage', () => {
    it('throws Forbidden when the pinner is not a member', async () => {
      prisma.message.findUnique.mockResolvedValue({ id: 5, chatId: 1 });
      asNonMember();
      await expect(service.pinMessage(5, 999)).rejects.toThrow(ForbiddenException);
      expect(prisma.message.update).not.toHaveBeenCalled();
    });

    it('throws NotFound when the message does not exist', async () => {
      prisma.message.findUnique.mockResolvedValue(null);
      await expect(service.pinMessage(5, 7)).rejects.toThrow(NotFoundException);
    });
  });

  describe('isMember', () => {
    it('is true when a matching chat row exists', async () => {
      prisma.chat.findFirst.mockResolvedValue({ id: 1 });
      await expect(service.isMember(1, 7)).resolves.toBe(true);
    });

    it('is false when no matching chat row exists', async () => {
      prisma.chat.findFirst.mockResolvedValue(null);
      await expect(service.isMember(1, 7)).resolves.toBe(false);
    });
  });
});
