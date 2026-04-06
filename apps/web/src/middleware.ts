import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
  locales: ['en', 'ru'],
  defaultLocale: 'en',
  localeDetection: true,
  localePrefix: 'always',
});

// ── Basic Auth (staging protection) ───────────────────────────────────────────
// Включается только если задана переменная BASIC_AUTH_PASSWORD
function basicAuth(req: NextRequest): NextResponse | null {
  const password = process.env.BASIC_AUTH_PASSWORD;
  if (!password) return null; // защита выключена — пропускаем

  const authHeader = req.headers.get('authorization');

  if (authHeader) {
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
      const [, pass] = decoded.split(':');
      if (pass === password) return null; // верный пароль — пропускаем
    }
  }

  return new NextResponse('Staging — restricted', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Staging"' },
  });
}

export default function middleware(req: NextRequest) {
  const authResponse = basicAuth(req);
  if (authResponse) return authResponse;

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
