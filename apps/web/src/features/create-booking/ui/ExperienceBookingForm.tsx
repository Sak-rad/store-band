'use client';

import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../shared/lib/api';
import { useFormatPrice } from '@/shared/store/currency.store';
import styles from './ExperienceBookingForm.module.scss';

interface Props { listing: any; }

const schema = z.object({
  date: z.string().min(1),
  guestCount: z.number().min(1).default(1),
});
type FormData = z.infer<typeof schema>;

// Booking widget for EXPERIENCE listings: a single date + number of people,
// priced per person. Sends checkIn === checkOut (no date range).
export function ExperienceBookingForm({ listing }: Props) {
  const t = useTranslations('booking');
  const tListings = useTranslations('listings');
  const formatPrice = useFormatPrice();

  const { register, handleSubmit, watch } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { guestCount: 1 },
  });

  const guests = watch('guestCount') || 1;
  const total = Number(listing.priceMin) * guests;

  const mutation = useMutation({
    mutationFn: (data: FormData) =>
      api.post('/bookings', {
        listingId: listing.id,
        checkIn: data.date,
        checkOut: data.date,
        guestCount: data.guestCount,
      }),
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
        <div className={styles.form__header__price}>
          {formatPrice(listing.priceMin)}
          <span> / {tListings('perPerson')}</span>
        </div>
      </div>

      <div className={styles.form__field}>
        <label>{t('date')}</label>
        <input type="date" {...register('date')} />
      </div>

      <div className={styles.form__field}>
        <label>{t('guests')}</label>
        <input type="number" min={1} max={50} {...register('guestCount', { valueAsNumber: true })} />
      </div>

      <div className={styles.form__total}>
        <span>{t('totalPrice')}</span>
        <span>{formatPrice(total)}</span>
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
