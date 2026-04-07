import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Providers } from '../../shared/ui/Providers';
import { CookieBanner } from '../../shared/ui/CookieBanner';
import { LocationBanner } from '../../shared/ui/LocationBanner';
import '../../../styles/globals.scss';

const locales = ['en', 'ru'];
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: { default: t('homeTitle'), template: `%s | Relocation Platform` },
    description: t('homeDescription'),
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: 'Relocate',
    },
    alternates: {
      languages: {
        en: `${BASE_URL}/en`,
        ru: `${BASE_URL}/ru`,
        'x-default': `${BASE_URL}/en`,
      },
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!locales.includes(locale)) notFound();
  const messages = await getMessages();

  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <head>
        <meta name="theme-color" content="#6366F1" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers locale={locale}>
            {children}
            <CookieBanner />
            <LocationBanner locale={locale} />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}
