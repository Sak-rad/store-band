'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link, useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { CreateBookingForm } from '../../create-booking/ui/CreateBookingForm';
import styles from './ListingDetail.module.scss';

interface Props {
  id: string;
  locale: string;
}

export function ListingDetail({ id, locale }: Props) {
  const t = useTranslations('listings');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const formatPrice = useCurrencyStore((s) => s.formatPrice);

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id, locale],
    queryFn: () => api.get(`/listings/${id}`, { params: { lang: locale } }).then((r) => r.data),
  });

  if (isLoading) return <p>{tCommon('loading')}</p>;
  if (!listing) return <p>{tCommon('error')}</p>;

  const locationStr = [listing.city?.name, listing.country?.name].filter(Boolean).join(', ');

  const handleContactProvider = () => {
    router.push(`/chats?providerId=${listing.provider?.id}&listingId=${listing.id}`);
  };

  return (
    <div className={styles.detail}>
      {/* ── Gallery ──────────────────────────────── */}
      {listing.media?.length > 0 && (
        <div className={styles.detail__gallery}>
          {listing.media.map((m: any, i: number) => (
            <div key={i} className={styles['detail__gallery__item']}>
              <Image src={m.url} alt={listing.title} fill style={{ objectFit: 'cover' }} sizes="800px" />
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column layout ────────────────────── */}
      <div className={styles.detail__layout}>
        <div className={styles.detail__info}>

          {/* Breadcrumb */}
          <nav className={styles.detail__breadcrumb}>
            <Link href="/listings">{t('allListings')}</Link>
            <span>›</span>
            {listing.category?.name && <span>{listing.category.name}</span>}
          </nav>

          {/* Category pill */}
          {listing.category?.name && (
            <span className={styles.detail__category}>{listing.category.name}</span>
          )}

          <h1 className={styles.detail__title}>{listing.title}</h1>

          {/* Meta row: location + rating */}
          <div className={styles.detail__meta}>
            {locationStr && (
              <div className={styles.detail__location}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {locationStr}
              </div>
            )}
            {listing.rating > 0 && (
              <div className={styles.detail__rating}>
                ★ {Number(listing.rating).toFixed(1)}
                {listing.reviewCount > 0 && (
                  <span>({listing.reviewCount} {t('reviews')})</span>
                )}
              </div>
            )}
          </div>

          {/* Price */}
          <div className={styles.detail__price}>
            <span className={styles['detail__price__amount']}>
              {formatPrice(listing.priceMin)}
            </span>
            <span className={styles['detail__price__period']}> / {t('perMonth')}</span>
          </div>

          {/* Description */}
          <div className={styles.detail__section}>
            <h2>{t('aboutListing')}</h2>
            <p className={styles.detail__description}>{listing.description}</p>
          </div>

          {/* Provider card */}
          {listing.provider && (
            <div className={styles.detail__provider}>
              <div className={styles.detail__provider__avatar}>
                {listing.provider.avatarUrl ? (
                  <Image src={listing.provider.avatarUrl} alt={listing.provider.name} fill style={{ objectFit: 'cover' }} sizes="48px" />
                ) : (
                  <span>{listing.provider.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className={styles.detail__provider__info}>
                <p className={styles.detail__provider__name}>{listing.provider.name}</p>
                {listing.provider.rating > 0 && (
                  <p className={styles.detail__provider__rating}>★ {Number(listing.provider.rating).toFixed(1)}</p>
                )}
              </div>
              <button className={styles.detail__provider__btn} onClick={handleContactProvider}>
                {t('contactProvider')}
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: booking panel */}
        <aside className={styles.detail__sidebar}>
          <CreateBookingForm listing={listing} />
        </aside>
      </div>
    </div>
  );
}
