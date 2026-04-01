import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Link } from '../../navigation';
import { Header } from '../../shared/ui/Header';
import { Footer } from '../../shared/ui/Footer';
import styles from './page.module.scss';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return { title: t('homeTitle'), description: t('homeDescription') };
}

const CATEGORIES = [
  { slug: 'apartments', icon: '🏢' },
  { slug: 'villas',     icon: '🏡' },
  { slug: 'excursions', icon: '🗺️' },
  { slug: 'transport',  icon: '🚗' },
  { slug: 'services',   icon: '🛠️' },
  { slug: 'food',       icon: '🍜' },
  { slug: 'healthcare', icon: '🏥' },
  { slug: 'education',  icon: '🎓' },
] as const;

const DESTINATIONS = [
  { city: 'Nha Trang', country: 'Vietnam',  emoji: '🇻🇳' },
  { city: 'Phuket',    country: 'Thailand', emoji: '🇹🇭' },
  { city: 'Pattaya',   country: 'Thailand', emoji: '🇹🇭' },
  { city: 'Dubai',     country: 'UAE',      emoji: '🇦🇪' },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t  = await getTranslations({ locale, namespace: 'listings' });
  const tC = await getTranslations({ locale, namespace: 'common' });

  return (
    <>
      <Header />
      <main className={styles.home}>

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.hero__inner}>
            <h1 className={styles.hero__title}>{t('searchTitle')}</h1>
            <p className={styles.hero__sub}>{t('searchPlaceholder')}</p>

            <div className={styles.hero__search}>
              <Link href="/listings" className={styles.hero__search__input}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.75" stroke="#94A3B8" strokeWidth="1.5"/>
                  <path d="M13 13L16.5 16.5" stroke="#94A3B8" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                <span>{t('searchPlaceholder')}</span>
              </Link>
              <Link href="/listings" className={styles.hero__search__btn}>
                {tC('search')}
              </Link>
            </div>

            <div className={styles.hero__tags}>
              {CATEGORIES.slice(0, 4).map(({ slug, icon }) => (
                <Link key={slug} href={`/listings?category=${slug}`} className={styles.hero__tag}>
                  {icon} {t(`categories.${slug}`)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Destinations ──────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.section__inner}>
            <h2 className={styles.section__title}>{t('popular')}</h2>
            <div className={styles.destinations}>
              {DESTINATIONS.map(({ city, country, emoji }) => (
                <Link
                  key={city}
                  href={`/listings?q=${city}`}
                  className={styles.destination}
                >
                  <span className={styles.destination__emoji}>{emoji}</span>
                  <div>
                    <p className={styles.destination__city}>{city}</p>
                    <p className={styles.destination__country}>{country}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Categories ────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.section__inner}>
            <h2 className={styles.section__title}>{t('filterCategory')}</h2>
            <div className={styles.categories}>
              {CATEGORIES.map(({ slug, icon }) => (
                <Link key={slug} href={`/listings?category=${slug}`} className={styles.category}>
                  <span className={styles.category__icon}>{icon}</span>
                  <span className={styles.category__label}>{t(`categories.${slug}`)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
