'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/lib/api';
import styles from './CreateBookingForm.module.scss';
import { useCurrencyStore } from '@/shared/store/currency.store';

interface Props { listing: any; }

const schema = z.object({
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guestCount: z.number().min(1).default(1),
}).refine((d) => new Date(d.checkOut) > new Date(d.checkIn), {
  path: ['checkOut'],
  message: 'checkout_before_checkin',
});
type FormData = z.infer<typeof schema>;

export function CreateBookingForm({ listing }: Props) {
  const t = useTranslations('booking');
  const formatPrice = useCurrencyStore((s) => s.formatPrice);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { guestCount: 1 },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/bookings', { ...data, listingId: listing.id }),
  });

  if (mutation.isSuccess) {
    return (
      <div className={styles.form}>
        <div className={styles.form__success}>
          <p>✓ {t('statuses.pending')}</p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit((d) => mutation.mutate(d))}>
      <div className={styles.form__header}>
        <div className={styles['form__header__price']}>
          {formatPrice(listing.priceMin)}
          <span> / мес.</span>
        </div>
        {listing.reviewCount > 0 && (
          <div className={styles['form__header__rating']}>
            ★ {listing.rating?.toFixed(1)} · {listing.reviewCount} отзывов
          </div>
        )}
      </div>

      <div className={styles.form__dates}>
        <div className={styles['form__date-field']}>
          <label>{t('checkIn')}</label>
          <input type="date" {...register('checkIn')} />
        </div>
        <div className={styles['form__date-field']}>
          <label>{t('checkOut')}</label>
          <input type="date" {...register('checkOut')} />
        </div>
      </div>
      {errors.checkOut && (
        <span className={styles.form__error}>{t('errors.checkoutBeforeCheckin')}</span>
      )}

      <div className={styles.form__field}>
        <label>{t('guests')}</label>
        <input type="number" min={1} max={20} {...register('guestCount', { valueAsNumber: true })} />
      </div>

      {mutation.isError && (
        <p className={styles.form__error}>{(mutation.error as any)?.response?.data?.message}</p>
      )}

      <button type="submit" className={styles.form__btn} disabled={mutation.isPending}>
        {mutation.isPending ? '...' : t('requestBooking')}
      </button>
    </form>
  );
}
