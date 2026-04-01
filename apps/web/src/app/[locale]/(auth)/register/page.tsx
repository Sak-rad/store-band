import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '../../../../navigation';
import { RegisterForm } from '../../../../features/auth/ui/RegisterForm';
import styles from '../auth.page.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return { title: t('registerTitle') };
}

export default async function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'auth' });
  return (
    <>
      <h1 className={styles.title}>{t('registerTitle')}</h1>
      <p className={styles.subtitle}>{t('hasAccount')} <Link href="/login" className={styles.link}>{t('loginBtn')}</Link></p>
      <RegisterForm />
    </>
  );
}
