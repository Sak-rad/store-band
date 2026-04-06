'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { MapPin, Star, MessageCircle, BadgeCheck } from 'lucide-react';
import { Link, useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { CreateBookingForm } from '@/features/create-booking/ui/CreateBookingForm';
import { PhotoSlider } from '@/entities/photo/ui/PhotoSlider';
import { ReviewsSection } from '@/entities/review/ui/ReviewsSection';
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
      {/* ── Photo slider ──────────────────────────────── */}
      {listing.media?.length > 0 && (
        <div className={styles.detail__gallery}>
          <PhotoSlider photos={listing.media} priority />
        </div>
      )}

      {/* ── Two-column layout ────────────────────── */}
      <div className={styles.detail__layout}>
        <div className={styles.detail__info}>
          {/* Breadcrumb */}
          <nav className={styles.detail__breadcrumb}>
            <button
              onClick={() => window.history.length > 1 ? router.back() : router.push('/listings')}
              className={styles.detail__breadcrumb__back}
            >{t('allListings')}</button>
            {listing.category?.slug && (
              <>
                <span>›</span>
                <Link href={`/listings/${listing.category.slug}`}>{listing.category.name}</Link>
              </>
            )}
          </nav>

          {/* Category pill */}
          {listing.category?.name && (
            <span className={styles.detail__category}>{listing.category.name}</span>
          )}

          <h1 className={styles.detail__title}>{listing.title}</h1>

          {/* Meta: location + rating */}
          <div className={styles.detail__meta}>
            {locationStr && (
              <div className={styles.detail__location}>
                <MapPin size={15} />
                {locationStr}
              </div>
            )}
            {listing.rating > 0 && (
              <div className={styles.detail__rating}>
                <Star size={14} fill="currentColor" />
                {Number(listing.rating).toFixed(1)}
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

          {/* Reviews */}
          <ReviewsSection
            listingId={listing.id}
            reviewCount={listing.reviewCount}
            locale={locale}
          />

          {/* Provider card */}
          {listing.provider && (
            <div className={styles.detail__provider}>
              <div className={styles.detail__provider__avatar}>
                {listing.provider.avatarUrl ? (
                  <Image
                    src={listing.provider.avatarUrl}
                    alt={listing.provider.name}
                    fill
                    sizes="48px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <span>{listing.provider.name?.[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className={styles.detail__provider__info}>
                <Link href={`/providers/${listing.provider.id}`} className={styles.detail__provider__name}>
                  {listing.provider.name}
                  {listing.provider.isVerified && <BadgeCheck size={15} className={styles.detail__provider__verified} />}
                </Link>
                {listing.provider.rating > 0 && (
                  <p className={styles.detail__provider__rating}>
                    <Star size={12} fill="currentColor" /> {Number(listing.provider.rating).toFixed(1)}
                  </p>
                )}
              </div>
              <button className={styles.detail__provider__btn} onClick={handleContactProvider} title={t('contactProvider')}>
                <MessageCircle size={18} />
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
