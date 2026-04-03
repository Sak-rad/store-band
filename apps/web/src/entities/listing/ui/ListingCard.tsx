'use client';

import Image from 'next/image';
import { Link } from '../../../navigation';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import styles from './ListingCard.module.scss';

interface Listing {
  id: string;
  title: string;
  priceMin: number;
  currency: string;
  category?: { name: string };
  city?: { name: string };
  country?: { name: string };
  media?: Array<{ url: string; thumbUrl?: string }>;
  rating: number;
  reviewCount: number;
}

interface Props { listing: Listing; locale: string; }

export function ListingCard({ listing }: Props) {
  const formatPrice = useCurrencyStore((s) => s.formatPrice);
  const thumb = listing.media?.[0]?.thumbUrl || listing.media?.[0]?.url;
  const location = [listing.city?.name, listing.country?.name].filter(Boolean).join(', ');

  return (
    <Link href={`/listings/${listing.id}`} scroll={false} className={styles.card}>
      <div className={styles.card__img}>
        {thumb ? (
          <Image
            src={thumb}
            alt={listing.title}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={styles.card__img__placeholder}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="#CBD5E1" strokeWidth="1.5"/>
              <circle cx="8.5" cy="8.5" r="1.5" stroke="#CBD5E1" strokeWidth="1.5"/>
              <path d="M3 16L8 11L12 15L15 12L21 18" stroke="#CBD5E1" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
        {listing.category && (
          <span className={styles.card__badge}>{listing.category.name}</span>
        )}
      </div>

      <div className={styles.card__body}>
        {location && <p className={styles.card__location}>{location}</p>}
        <h3 className={styles.card__title}>{listing.title}</h3>
        <div className={styles.card__footer}>
          <p className={styles.card__price}>
            <strong>{formatPrice(listing.priceMin)}</strong>
            <span> / mo</span>
          </p>
          {listing.reviewCount > 0 && (
            <span className={styles.card__rating}>
              ★ {listing.rating.toFixed(1)}
              <span className={styles.card__rating__count}> ({listing.reviewCount})</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
