'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import Image from 'next/image';
import { MapPin, Star, MessageCircle, BadgeCheck } from 'lucide-react';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { CreateBookingForm } from '@/features/create-booking/ui/CreateBookingForm';
import { PhotoSlider } from '@/entities/photo/ui/PhotoSlider';
import { ReviewsSection } from '@/entities/review/ui/ReviewsSection';
import styles from './ListingSheet.module.scss';

interface Props {
  id: string;
  locale: string;
}

export function ListingSheet({ id, locale }: Props) {
  const router = useRouter();
  const t = useTranslations('listings');
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const scrollRef   = useRef<HTMLDivElement>(null);
  const reviewsRef  = useRef<HTMLElement>(null);

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const { data: listing, isLoading } = useQuery({
    queryKey: ['listing', id, locale],
    queryFn: () =>
      api.get(`/listings/${id}`, { params: { lang: locale } }).then((r) => r.data),
  });

  const close = useCallback(() => router.back(), [router]);

  useLayoutEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); };
  }, [close]);

  const locationStr = listing
    ? [listing.city?.name, listing.country?.name].filter(Boolean).join(', ')
    : '';

  const handleContact = async () => {
    if (!listing?.provider) return;
    try {
      const res = await api.post('/chats', {
        providerId: listing.provider.id,
        listingId: listing.id,
      });
      const chatId = res.data.id;
      window.location.href = `/${locale}/chats/${chatId}`;
    } catch {
      window.location.href = `/${locale}/chats`;
    }
  };

  const hasPhotos = (listing?.media?.length ?? 0) > 0;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className={styles.overlay__backdrop} onClick={close} />

      {/* Panel */}
      <div className={styles.overlay__panel}>
        {/* Close */}
        <button className={styles.panel__close} onClick={close} aria-label="Close">✕</button>

        {/* Scroll container — photo + content both live here */}
        <div ref={scrollRef} className={styles.panel__scroll}>

          {/* ─── Photo (sticky on mobile, normal on desktop) ─── */}
          {hasPhotos && (
            <div className={styles.panel__photos}>
              <PhotoSlider photos={listing!.media} priority overlapped />
            </div>
          )}

          {/* ─── White content card ─── */}
          <div className={`${styles.panel__content} ${!hasPhotos ? styles['panel__content--no-photo'] : ''}`}>
            {/* Drag handle (mobile only) */}
            <div className={styles.panel__handle} />

            {isLoading && (
              <div className={styles.panel__skeleton}>
                <div className={styles['panel__skeleton-line']} style={{ width: '40%' }} />
                <div className={styles['panel__skeleton-line']} style={{ width: '75%' }} />
                <div className={styles['panel__skeleton-line']} style={{ width: '55%' }} />
              </div>
            )}

            {listing && (
              <>
                {listing.category?.name && (
                  <span className={styles.content__category}>{listing.category.name}</span>
                )}

                <h2 className={styles.content__title}>{listing.title}</h2>

                <div className={styles.content__meta}>
                  {locationStr && (
                    <span className={styles.content__location}>
                      <MapPin size={13} />
                      {locationStr}
                    </span>
                  )}
                  {listing.rating > 0 && (
                    <span
                      className={styles.content__rating}
                      onClick={scrollToReviews}
                      style={{ cursor: 'pointer' }}
                      title="View reviews"
                    >
                      <Star size={12} fill="currentColor" />
                      {Number(listing.rating).toFixed(1)}
                      {listing.reviewCount > 0 && <em>({listing.reviewCount})</em>}
                    </span>
                  )}
                </div>

                <div className={styles.content__price}>
                  <strong>{formatPrice(listing.priceMin)}</strong>
                  <span> / {t('perMonth')}</span>
                </div>

                <p className={styles.content__description}>{listing.description}</p>

                {/* Provider */}
                {listing.provider && (
                  <div className={styles.content__provider}>
                    <div className={styles['content__prov-avatar']}>
                      {listing.provider.avatarUrl
                        ? <Image src={listing.provider.avatarUrl} alt={listing.provider.name} fill sizes="44px" style={{ objectFit: 'cover' }} />
                        : <span>{listing.provider.name?.[0]?.toUpperCase()}</span>}
                    </div>
                    <div className={styles['content__prov-info']}>
                      <a href={`/${locale}/providers/${listing.provider.id}`} className={styles['content__prov-name']}>
                        {listing.provider.name}
                        {listing.provider.isVerified && <BadgeCheck size={14} className={styles['content__prov-badge']} />}
                      </a>
                      {listing.provider.rating > 0 && (
                        <p className={styles['content__prov-verified']}>
                          <Star size={11} fill="currentColor" /> {Number(listing.provider.rating).toFixed(1)}
                        </p>
                      )}
                    </div>
                    <button className={styles['content__prov-btn']} onClick={handleContact} title={t('contactProvider')}>
                      <MessageCircle size={18} />
                    </button>
                  </div>
                )}

                {/* Reviews */}
                <ReviewsSection
                  listingId={listing.id}
                  reviewCount={listing.reviewCount}
                  locale={locale}
                  sectionRef={reviewsRef}
                  containerRef={scrollRef}
                />

                {/* Booking */}
                <div className={styles.content__booking}>
                  <CreateBookingForm listing={listing} />
                </div>

                <a href={`/${locale}/listing/${listing.id}`} className={styles.content__fullpage}>
                  {t('viewFullPage')} →
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
