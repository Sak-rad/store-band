'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { api } from '@/shared/lib/api';
import { ListingCard } from '@/entities/listing/ui/ListingCard';
import { ReviewsSection } from '@/entities/review/ui/ReviewsSection';
import styles from './ProviderDetail.module.scss';

interface Props {
  id: number;
  locale: string;
}

export function ProviderDetail({ id, locale }: Props) {
  const t  = useTranslations('provider');
  const tC = useTranslations('common');

  const { data: provider, isLoading: loadingProvider } = useQuery({
    queryKey: ['provider', id],
    queryFn: () => api.get(`/providers/${id}`, { params: { lang: locale } }).then(r => r.data),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ['provider-listings', id, locale],
    queryFn: () => api.get(`/providers/${id}/listings`, { params: { lang: locale } }).then(r => r.data),
    enabled: !!provider,
  });

  if (loadingProvider) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeleton__hero} />
        <div className={styles.skeleton__body}>
          {[1, 2, 3].map(i => <div key={i} className={styles.skeleton__card} />)}
        </div>
      </div>
    );
  }

  if (!provider) return <p className={styles.error}>{tC('error')}</p>;

  const memberYear = new Date(provider.createdAt).getFullYear();

  const handleContact = async () => {
    try {
      const res = await api.post('/chats', { providerId: provider.id });
      window.location.href = `/${locale}/chats/${res.data.id}`;
    } catch {
      window.location.href = `/${locale}/chats`;
    }
  };

  return (
    <div className={styles.page}>

      {/* ── Hero card ────────────────────────────────── */}
      <div className={styles.hero}>
        <div className={styles.hero__avatar}>
          {provider.avatarUrl ? (
            <Image src={provider.avatarUrl} alt={provider.name} fill sizes="96px" style={{ objectFit: 'cover' }} />
          ) : (
            <span>{provider.name[0].toUpperCase()}</span>
          )}
        </div>

        <div className={styles.hero__info}>
          <div className={styles.hero__nameRow}>
            <h1 className={styles.hero__name}>{provider.name}</h1>
            {provider.isVerified && (
              <span className={styles.hero__verified}>✓ {t('verified')}</span>
            )}
          </div>

          {provider.rating > 0 && (
            <div className={styles.hero__rating}>
              <span className={styles.hero__stars}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < Math.round(provider.rating) ? styles['hero__star--on'] : styles['hero__star--off']}>★</span>
                ))}
              </span>
              <span className={styles.hero__ratingVal}>{Number(provider.rating).toFixed(1)}</span>
              <span className={styles.hero__ratingCount}>({provider.reviewCount} {t('reviews')})</span>
            </div>
          )}

          <p className={styles.hero__since}>
            {t('memberSince', { date: memberYear })}
            {listings.length > 0 && (
              <> · <strong>{listings.length}</strong> {t('listings')}</>
            )}
          </p>
        </div>

        <button className={styles.hero__contactBtn} onClick={handleContact}>
          {t('message')}
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.layout__main}>

          {/* ── Bio ─────────────────────────────────── */}
          {provider.bio && (
            <section className={styles.section}>
              <h2 className={styles.section__title}>О провайдере</h2>
              <p className={styles.bio}>{provider.bio}</p>
            </section>
          )}

          {/* ── Listings ────────────────────────────── */}
          <section className={styles.section}>
            <h2 className={styles.section__title}>
              {t('listings')}
              {listings.length > 0 && <span className={styles.section__count}>{listings.length}</span>}
            </h2>
            {listings.length === 0 ? (
              <p className={styles.empty}>{t('noListings')}</p>
            ) : (
              <div className={styles.grid}>
                {listings.map((l: any, i: number) => (
                  <ListingCard key={l.id} listing={l} locale={locale} priority={i < 3} />
                ))}
              </div>
            )}
          </section>

          {/* ── Reviews ─────────────────────────────── */}
          <ReviewsSection
            providerId={provider.id}
            reviewCount={provider.reviewCount}
            locale={locale}
          />
        </div>

        {/* ── Sidebar: contacts ───────────────────── */}
        <aside className={styles.sidebar}>
          <div className={styles.contacts}>
            <h3 className={styles.contacts__title}>{t('contact')}</h3>

            {provider.phone && (
              <a href={`tel:${provider.phone}`} className={styles.contacts__row}>
                <span className={styles.contacts__icon}>📞</span>
                <div>
                  <p className={styles.contacts__label}>{t('phone')}</p>
                  <p className={styles.contacts__value}>{provider.phone}</p>
                </div>
              </a>
            )}

            {provider.website && (
              <a href={provider.website} target="_blank" rel="noopener noreferrer" className={styles.contacts__row}>
                <span className={styles.contacts__icon}>🌐</span>
                <div>
                  <p className={styles.contacts__label}>{t('website')}</p>
                  <p className={styles.contacts__value}>
                    {provider.website.replace(/^https?:\/\//, '')}
                  </p>
                </div>
              </a>
            )}

            {!provider.phone && !provider.website && (
              <p className={styles.contacts__empty}>—</p>
            )}

            <button className={styles.contacts__btn} onClick={handleContact}>
              {t('message')}
            </button>
          </div>

          {/* Stats card */}
          <div className={styles.stats}>
            <div className={styles.stats__item}>
              <span className={styles.stats__val}>{listings.length}</span>
              <span className={styles.stats__label}>{t('listings')}</span>
            </div>
            {provider.rating > 0 && (
              <div className={styles.stats__item}>
                <span className={styles.stats__val}>★ {Number(provider.rating).toFixed(1)}</span>
                <span className={styles.stats__label}>{t('reviews')}</span>
              </div>
            )}
            <div className={styles.stats__item}>
              <span className={styles.stats__val}>{memberYear}</span>
              <span className={styles.stats__label}>С года</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
