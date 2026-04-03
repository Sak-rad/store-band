import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        role: true, preferredLocale: true, createdAt: true,
      },
    });
    if (!user) throw new NotFoundException();
    return user;
  }

  async update(userId: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, email: true, name: true, avatarUrl: true,
        role: true, preferredLocale: true, createdAt: true,
      },
    });
  }

  async remove(userId: number) {
    await this.prisma.user.delete({ where: { id: userId } });
  }
}
