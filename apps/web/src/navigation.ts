import { createNavigation } from 'next-intl/navigation';

export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation({ locales });
