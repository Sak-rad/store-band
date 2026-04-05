'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../shared/lib/api';
import styles from './BookingsList.module.scss';

export function BookingsList() {
  const t = useTranslations('booking');
  const tCommon = useTranslations('common');

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get('/bookings').then((r) => r.data),
  });

  const statusLabel = (status: string) => {
    const key = status.toLowerCase() as 'pending' | 'confirmed' | 'cancelled';
    return t(`statuses.${key}`);
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.page__title}>{t('checkIn')}</h1>
      <div className={styles.list}>
        {isLoading && <p className={styles.list__empty}>{tCommon('loading')}</p>}
        {!isLoading && !bookings?.length && (
          <p className={styles.list__empty}>{tCommon('noResults')}</p>
        )}
        {bookings?.map((booking: any) => (
          <div key={booking.id} className={styles.item}>
            <div className={styles.item__thumb} />
            <div className={styles.item__body}>
              <p className={styles.item__title}>{booking.listing?.title}</p>
              <p className={styles.item__dates}>
                {new Date(booking.checkIn).toLocaleDateString()} — {new Date(booking.checkOut).toLocaleDateString()}
              </p>
              {booking.totalPrice && (
                <p className={styles.item__total}>
                  {t('totalPrice')}: {Number(booking.totalPrice).toLocaleString()} {booking.currency}
                </p>
              )}
            </div>
            <span className={`${styles.item__status} ${styles[`item__status--${booking.status.toLowerCase()}`]}`}>
              {statusLabel(booking.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
