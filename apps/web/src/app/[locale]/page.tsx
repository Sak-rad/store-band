import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { Search, MapPin, CheckCircle, Shield, Star, TrendingUp, ArrowRight } from 'lucide-react';
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
  { slug: 'apartments', icon: '🏢', color: '#0EA5E9' },
  { slug: 'villas',     icon: '🏡', color: '#10B981' },
  { slug: 'excursions', icon: '🗺️', color: '#F59E0B' },
  { slug: 'transport',  icon: '🚗', color: '#8B5CF6' },
  { slug: 'services',   icon: '🛠️', color: '#F97316' },
  { slug: 'food',       icon: '🍜', color: '#EF4444' },
  { slug: 'healthcare', icon: '🏥', color: '#EC4899' },
  { slug: 'education',  icon: '🎓', color: '#06B6D4' },
] as const;

const DESTINATIONS = [
  { city: 'Nha Trang', country: 'Vietnam',  emoji: '🇻🇳', slug_city: 'nha-trang',  slug_country: 'vietnam'  },
  { city: 'Phuket',    country: 'Thailand', emoji: '🇹🇭', slug_city: 'phuket',     slug_country: 'thailand' },
  { city: 'Pattaya',   country: 'Thailand', emoji: '🇹🇭', slug_city: 'pattaya',    slug_country: 'thailand' },
  { city: 'Dubai',     country: 'UAE',      emoji: '🇦🇪', slug_city: 'dubai',      slug_country: 'uae'      },
];

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t  = await getTranslations({ locale, namespace: 'listings' });
  const tH = await getTranslations({ locale, namespace: 'home' });

  const steps = [
    { num: '01', Icon: Search,       title: tH('steps.step1.title'), desc: tH('steps.step1.desc') },
    { num: '02', Icon: MapPin,       title: tH('steps.step2.title'), desc: tH('steps.step2.desc') },
    { num: '03', Icon: CheckCircle,  title: tH('steps.step3.title'), desc: tH('steps.step3.desc') },
  ];

  const uspItems = [
    { Icon: Shield,      title: tH('usp.verified.title'), desc: tH('usp.verified.desc'), color: '#0EA5E9' },
    { Icon: Star,        title: tH('usp.reviews.title'),  desc: tH('usp.reviews.desc'),  color: '#F59E0B' },
    { Icon: TrendingUp,  title: tH('usp.prices.title'),   desc: tH('usp.prices.desc'),   color: '#10B981' },
  ];

  const statItems = [
    { value: '1,200+', label: tH('stats.listingsLabel')  },
    { value: '40+',    label: tH('stats.citiesLabel')    },
    { value: '8',      label: tH('stats.countriesLabel') },
    { value: '500+',   label: tH('stats.providersLabel') },
  ];

  return (
    <>
      <Header />
      <main className={styles.home}>

        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.hero__orb1} />
          <div className={styles.hero__orb2} />
          <div className={styles.hero__orb3} />

          <div className={styles.hero__inner}>
            <p className={styles.hero__badge}>✦ {tH('trustBadge')}</p>

            <h1 className={styles.hero__title}>
              {tH('heroTitle')}{' '}
              <span className={styles.hero__accent}>{tH('heroAccent')}</span>
            </h1>

            <p className={styles.hero__sub}>{tH('heroSub')}</p>

            <div className={styles.hero__search}>
              <Link href="/listings" className={styles.hero__search__input}>
                <Search size={18} color="#94A3B8" strokeWidth={2} />
                <span>{t('searchPlaceholder')}</span>
              </Link>
              <Link href="/listings" className={styles.hero__search__btn}>
                {tH('searchBtn')} <ArrowRight size={16} />
              </Link>
            </div>

            <div className={styles.hero__tags}>
              {CATEGORIES.slice(0, 5).map(({ slug, icon }) => (
                <Link key={slug} href={`/listings/${slug}`} className={styles.hero__tag}>
                  {icon} {t(`categories.${slug}`)}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats strip ───────────────────────────────────────────────── */}
        <div className={styles.stats}>
          {statItems.map(({ value, label }) => (
            <div key={label} className={styles.stats__item}>
              <span className={styles.stats__value}>{value}</span>
              <span className={styles.stats__label}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Categories ────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.section__inner}>
            <div className={styles.section__header}>
              <h2 className={styles.section__title}>{t('filterCategory')}</h2>
              <Link href="/listings" className={styles.section__link}>
                {tH('viewAll')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.categories}>
              {CATEGORIES.map(({ slug, icon, color }) => (
                <Link
                  key={slug}
                  href={`/listings/${slug}`}
                  className={styles.category}
                  style={{ '--cat-color': color } as React.CSSProperties}
                >
                  <span className={styles.category__icon}>{icon}</span>
                  <span className={styles.category__label}>{t(`categories.${slug}`)}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles['section--alt']}`}>
          <div className={styles.section__inner}>
            <h2 className={`${styles.section__title} ${styles['section__title--center']}`}>
              {tH('steps.title')}
            </h2>
            <div className={styles.steps}>
              {steps.map(({ num, Icon, title, desc }) => (
                <div key={num} className={styles.step}>
                  <span className={styles.step__num}>{num}</span>
                  <div className={styles.step__icon}><Icon size={22} strokeWidth={2} /></div>
                  <h3 className={styles.step__title}>{title}</h3>
                  <p className={styles.step__desc}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Destinations ──────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className={styles.section__inner}>
            <div className={styles.section__header}>
              <h2 className={styles.section__title}>{t('popular')}</h2>
              <Link href="/listings" className={styles.section__link}>
                {tH('viewAll')} <ArrowRight size={14} />
              </Link>
            </div>
            <div className={styles.destinations}>
              {DESTINATIONS.map(({ city, country, emoji, slug_city, slug_country }) => (
                <Link
                  key={city}
                  href={`/listings/${slug_country}/${slug_city}`}
                  className={styles.destination}
                >
                  <span className={styles.destination__emoji}>{emoji}</span>
                  <div className={styles.destination__text}>
                    <p className={styles.destination__city}>{city}</p>
                    <p className={styles.destination__country}>{country}</p>
                  </div>
                  <ArrowRight size={15} className={styles.destination__arrow} />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Why us ────────────────────────────────────────────────────── */}
        <section className={`${styles.section} ${styles['section--blue']}`}>
          <div className={styles.section__inner}>
            <h2 className={`${styles.section__title} ${styles['section__title--center']}`}>
              {tH('usp.title')}
            </h2>
            <div className={styles.usp}>
              {uspItems.map(({ Icon, title, desc, color }) => (
                <div key={title} className={styles.usp__card}>
                  <div className={styles.usp__icon} style={{ background: `${color}18`, color }}>
                    <Icon size={22} strokeWidth={2} />
                  </div>
                  <h3 className={styles.usp__title}>{title}</h3>
                  <p className={styles.usp__desc}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────────────────── */}
        <section className={styles.cta}>
          <div className={styles.cta__orb} />
          <div className={styles.cta__inner}>
            <h2 className={styles.cta__title}>{tH('cta.title')}</h2>
            <p className={styles.cta__desc}>{tH('cta.desc')}</p>
            <Link href="/listings" className={styles.cta__btn}>
              {tH('cta.btn')} <ArrowRight size={18} />
            </Link>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
