import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class LocaleInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const lang =
      req.query?.lang ||
      this.parseAcceptLanguage(req.headers['accept-language']) ||
      req.user?.preferredLocale ||
      'en';

    req.locale = ['en', 'ru'].includes(lang) ? lang : 'en';
    return next.handle();
  }

  private parseAcceptLanguage(header: string): string | null {
    if (!header) return null;
    const locale = header.split(',')[0].trim().substring(0, 2).toLowerCase();
    return ['en', 'ru'].includes(locale) ? locale : null;
  }
}
