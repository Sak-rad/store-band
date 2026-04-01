import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '../../../../navigation';
import { LoginForm } from '../../../../features/auth/ui/LoginForm';
import styles from '../auth.page.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('loginTitle') };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <>
      <h1 className={styles.title}>{t('loginTitle')}</h1>
      <p className={styles.subtitle}>{t('noAccount')} <Link href="/register" className={styles.link}>{t('registerBtn')}</Link></p>
      <LoginForm />
    </>
  );
}
