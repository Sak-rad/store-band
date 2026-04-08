'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useLocationStore } from '../store/location.store';
import styles from './CookieBanner.module.scss';
import Link from 'next/link';

export function CookieBanner() {
  const { cookieConsent, setCookieConsent } = useLocationStore();
  const t = useTranslations('cookies');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!cookieConsent) {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [cookieConsent]);

  if (cookieConsent || !visible) return null;

  const accept = () => {
    setCookieConsent('accepted');
    setVisible(false);
  };

  const decline = () => {
    setCookieConsent('declined');
    setVisible(false);
  };

  return (
    <div className={styles.banner}>
      <div className={styles.banner__content}>
        <p className={styles.banner__text}>
          🍪 {t('text')}{' '}
          <Link href="/privacy" className={styles.banner__link}>{t('policy')}</Link>
        </p>
        <div className={styles.banner__actions}>
          <button className={styles.banner__decline} onClick={decline}>
            {t('decline')}
          </button>
          <button className={styles.banner__accept} onClick={accept}>
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
