import { getLocale, getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { Header } from '../../shared/ui/Header';
import styles from './not-found.module.scss';

const CATEGORIES = [
  { slug: 'real-estate', emoji: '🏠' },
  { slug: 'transport',   emoji: '🚗' },
  { slug: 'healthcare',  emoji: '🏥' },
  { slug: 'education',   emoji: '📚' },
  { slug: 'services',    emoji: '🛎' },
  { slug: 'food',        emoji: '🍽' },
  { slug: 'excursions',  emoji: '🗺' },
] as const;

export default async function NotFound() {
  const locale = await getLocale();
  const t  = await getTranslations({ locale, namespace: 'notFound' });
  const tL = await getTranslations({ locale, namespace: 'listings' });

  return (
    <>
      <Header />
      <main className={styles.page}>
        <div className={styles.card}>

          <div className={styles.visual}>
            <span className={styles.code}>{t('code')}</span>
          </div>

          <p className={styles.subtitle}>{t('subtitle')}</p>
          <h1 className={styles.title}>{t('title')}</h1>

          <div className={styles.divider} />

          <p className={styles.description}>{t('description')}</p>

          {/* ── Category quick links ────────────────── */}
          <p className={styles.explore}>{t('explore')}</p>
          <div className={styles.grid}>
            {CATEGORIES.map(({ slug, emoji }) => (
              <Link
                key={slug}
                href={`/${locale}/listings/${slug}`}
                className={styles.cat}
              >
                <span className={styles.cat__emoji}>{emoji}</span>
                <span className={styles.cat__name}>{tL(`categories.${slug}`)}</span>
              </Link>
            ))}
          </div>

          <Link href={`/${locale}/listings`} className={styles.button}>
            {t('button')}
          </Link>

        </div>
      </main>
    </>
  );
}
