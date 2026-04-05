'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '../../../shared/store/auth.store';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { Link } from '../../../navigation';
import styles from './AdminListingsPanel.module.scss';

interface Props { locale: string }

export function AdminListingsPanel({ locale }: Props) {
  const { user } = useAuthStore();
  const tCommon = useTranslations('common');
  const formatPrice = useCurrencyStore(s => s.formatPrice);
  const qc = useQueryClient();
  const [actionId, setActionId] = useState<number | null>(null);

  const { data: listings, isLoading } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: () => api.get('/listings/pending').then(r => r.data),
    enabled: user?.role === 'ADMIN',
  });

  const approve = useMutation({
    mutationFn: (id: number) => api.patch(`/listings/${id}/approve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pending'] }); setActionId(null); },
  });

  const reject = useMutation({
    mutationFn: (id: number) => api.patch(`/listings/${id}/reject`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-pending'] }); setActionId(null); },
  });

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.empty}>Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.header__title}>Pending Listings</h1>
        <p className={styles.header__sub}>
          {listings?.length ?? 0} listing{listings?.length !== 1 ? 's' : ''} awaiting approval
        </p>
      </div>

      {isLoading && <p className={styles.empty}>{tCommon('loading')}</p>}

      {!isLoading && !listings?.length && (
        <div className={styles.empty__box}>
          <span>✅</span>
          <p>All caught up! No pending listings.</p>
        </div>
      )}

      <div className={styles.list}>
        {listings?.map((listing: any) => (
          <div key={listing.id} className={styles.card}>
            {/* Thumbnail */}
            <div className={styles.card__thumb}>
              {listing.media?.[0] ? (
                <img src={listing.media[0].url} alt={listing.title} />
              ) : (
                <span>🏠</span>
              )}
            </div>

            {/* Info */}
            <div className={styles.card__info}>
              <div className={styles.card__meta}>
                <span className={styles.card__cat}>{listing.category?.name}</span>
                <span className={styles.card__id}>#{listing.id}</span>
              </div>
              <h3 className={styles.card__title}>{listing.title}</h3>
              <p className={styles.card__location}>
                {listing.city?.name}, {listing.country?.name}
              </p>
              <p className={styles.card__price}>{formatPrice(listing.priceMin)} / mo</p>

              {/* Provider */}
              {listing.provider && (
                <div className={styles.card__provider}>
                  <div className={styles.card__provider__avatar}>
                    {listing.provider.name?.[0]?.toUpperCase()}
                  </div>
                  <span>{listing.provider.name}</span>
                  {listing.provider.isVerified && <span className={styles.card__provider__verified}>✓</span>}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className={styles.card__actions}>
              <Link href={`/listing/${listing.id}`} className={styles.btn__view} target="_blank">
                View
              </Link>
              <button
                className={styles.btn__approve}
                onClick={() => { setActionId(listing.id); approve.mutate(listing.id); }}
                disabled={actionId === listing.id}
              >
                {actionId === listing.id && approve.isPending ? '...' : '✓ Approve'}
              </button>
              <button
                className={styles.btn__reject}
                onClick={() => { setActionId(listing.id); reject.mutate(listing.id); }}
                disabled={actionId === listing.id}
              >
                {actionId === listing.id && reject.isPending ? '...' : '✕ Reject'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
