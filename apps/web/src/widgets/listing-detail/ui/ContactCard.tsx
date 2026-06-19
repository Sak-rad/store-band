'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { MessageCircle } from 'lucide-react';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useFormatPrice } from '../../../shared/store/currency.store';
import { getPriceSuffixKey, type ListingKind } from '../../../shared/lib/listing-kind';
import styles from './ContactCard.module.scss';

interface Props {
  listing: any;
  kind: ListingKind;
}

// Sidebar for non-STAY listings (sale / experience / service): price + a single
// "get in touch" CTA that opens a chat with the provider. No date-range booking.
export function ContactCard({ listing, kind }: Props) {
  const t = useTranslations('listings');
  const formatPrice = useFormatPrice();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const suffixKey = getPriceSuffixKey(listing, kind);

  const contact = async () => {
    if (!listing.provider) return;
    setLoading(true);
    try {
      const res = await api.post('/chats', {
        providerId: listing.provider.id,
        listingId: listing.id,
      });
      router.push(`/chats/${res.data.id}`);
    } catch {
      router.push('/chats');
    } finally {
      setLoading(false);
    }
  };

  const cta = kind === 'SALE' ? t('requestViewing') : t('contactProvider');

  return (
    <div className={styles.card}>
      <div className={styles.card__price}>
        {listing.priceOnRequest ? (
          <strong>{t('priceOnRequest')}</strong>
        ) : (
          <>
            {kind === 'SERVICE' && <span className={styles.card__from}>{t('priceFrom')} </span>}
            <strong>{formatPrice(listing.priceMin)}</strong>
            {suffixKey && <span className={styles.card__period}> / {t(suffixKey)}</span>}
          </>
        )}
      </div>

      <button className={styles.card__btn} onClick={contact} disabled={loading}>
        <MessageCircle size={18} />
        {loading ? '...' : cta}
      </button>
    </div>
  );
}
