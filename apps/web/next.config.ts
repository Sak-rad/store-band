import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const securityHeaders = [
  // Запрещает embedding в iframe на сторонних сайтах (clickjacking)
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Запрещает браузеру угадывать MIME type
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // При переходе с HTTPS на HTTP — не передаёт Referer
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Разрешает браузеру использовать только HTTPS (1 год)
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
  // Ограничивает доступ к API браузера (геолокация, камера и тд)
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  sassOptions: {
    silenceDeprecations: ['import', 'legacy-js-api'],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
      // Allow any HTTP host in staging/dev (set ALLOW_ANY_HTTP_HOST=true as build arg)
      ...(process.env.ALLOW_ANY_HTTP_HOST === 'true'
        ? [{ protocol: 'http' as const, hostname: '**' }]
        : []),
    ],
  },
};

export default withNextIntl(nextConfig);
