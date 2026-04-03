import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  sassOptions: {
    silenceDeprecations: ['import', 'legacy-js-api'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'cdn.example.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: '*.unsplash.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

export default withNextIntl(nextConfig);
