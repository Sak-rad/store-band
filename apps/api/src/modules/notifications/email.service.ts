import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';

@Injectable()
export class EmailService {
  private resend: Resend | null = null;

  constructor(private config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (apiKey) {
      this.resend = new Resend(apiKey);
    }
  }

  async send(to: string, template: string, locale: string, params: Record<string, any>) {
    const subjects: Record<string, Record<string, string>> = {
      en: {
        'booking-request': 'New booking request',
        'booking-confirmed': 'Your booking is confirmed',
        'booking-cancelled': 'Booking was cancelled',
        'new-message': 'You have a new message',
      },
      ru: {
        'booking-request': 'Новый запрос на бронирование',
        'booking-confirmed': 'Ваше бронирование подтверждено',
        'booking-cancelled': 'Бронирование отменено',
        'new-message': 'У вас новое сообщение',
      },
    };

    const subject = subjects[locale]?.[template] ?? subjects['en'][template] ?? 'Relocation Platform';

    // В dev режиме просто логируем, не отправляем
    if (this.config.get('NODE_ENV') !== 'production') {
      console.log(`\n📧 [DEV EMAIL] to=${to} | subject="${subject}"`);
      return;
    }

    const templatePath = path.join(__dirname, 'templates', `${template}.${locale}.hbs`);
    let html: string;
    try {
      const source = fs.readFileSync(templatePath, 'utf8');
      html = Handlebars.compile(source)(params);
    } catch {
      const fallbackPath = path.join(__dirname, 'templates', `${template}.en.hbs`);
      const source = fs.readFileSync(fallbackPath, 'utf8');
      html = Handlebars.compile(source)(params);
    }

    if (!this.resend) {
      console.warn(`[EmailService] RESEND_API_KEY not set, skipping email to ${to}`);
      return;
    }

    await this.resend.emails.send({
      from: this.config.get('EMAIL_FROM', 'noreply@example.com'),
      to,
      subject,
      html,
    });
  }
}
