import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private i18n: I18nService,
  ) {}

  async register(dto: RegisterDto, ip: string, userAgent: string, lang: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(
        await this.i18n.translate('errors.emailTaken', { lang }),
      );
    }

    const passwordHash = await argon2.hash(dto.password, {
      memoryCost: 65536,
      timeCost: 3,
    });

    const preferredLocale = ['en', 'ru'].includes(lang) ? lang : 'en';
    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, passwordHash, preferredLocale },
    });

    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    await this.createSession(user.id, refreshToken, ip, userAgent);

    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  async login(dto: LoginDto, ip: string, userAgent: string, lang: string) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user?.passwordHash) {
      throw new UnauthorizedException(
        await this.i18n.translate('errors.invalidCredentials', { lang }),
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException(
        await this.i18n.translate('errors.invalidCredentials', { lang }),
      );
    }

    const { accessToken, refreshToken } = await this.generateTokens(user.id);
    await this.createSession(user.id, refreshToken, ip, userAgent);

    return { accessToken, refreshToken, user: this.sanitizeUser(user) };
  }

  async refresh(refreshToken: string, ip: string, userAgent: string) {
    const session = await this.prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new ForbiddenException('Invalid or expired refresh token');
    }

    await this.prisma.session.delete({ where: { id: session.id } });

    const { accessToken, refreshToken: newRefresh } = await this.generateTokens(session.userId);
    await this.createSession(session.userId, newRefresh, ip, userAgent);

    return { accessToken, refreshToken: newRefresh, user: this.sanitizeUser(session.user) };
  }

  async logout(refreshToken: string) {
    await this.prisma.session.deleteMany({ where: { refreshToken } });
  }

  private async generateTokens(userId: number) {
    const accessToken = this.jwt.sign({ sub: userId });
    const refreshToken = crypto.randomBytes(64).toString('hex');
    return { accessToken, refreshToken };
  }

  private async createSession(
    userId: number,
    refreshToken: string,
    ip: string,
    userAgent: string,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.prisma.session.create({
      data: { userId, refreshToken, ip, userAgent, expiresAt },
    });
  }

  private sanitizeUser(user: any) {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
