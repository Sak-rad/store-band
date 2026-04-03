'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { redirect } from 'next/navigation';
import { useAuthStore } from '../../../shared/store/auth.store';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { Link } from '../../../navigation';
import styles from './ProfileView.module.scss';

interface Props { locale: string }

export function ProfileView({ locale }: Props) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const tListings = useTranslations('listings');
  const { user } = useAuthStore();
  const { displayCurrency, toggle } = useCurrencyStore();

  // Fetch own listings (PROVIDER / ADMIN)
  const { data: myListings } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api.get('/listings/my').then(r => r.data),
    enabled: user?.role === 'PROVIDER' || user?.role === 'ADMIN',
  });

  // Fetch bookings (USER)
  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get('/bookings').then(r => r.data),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className={styles.page}>
        <p className={styles.page__unauthenticated}>
          <Link href="/login">{t('loginToView')}</Link>
        </p>
      </div>
    );
  }

  const initials = user.name
    ? user.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase();

  const isProvider = user.role === 'PROVIDER';
  const isAdmin = user.role === 'ADMIN';

  return (
    <div className={styles.page}>
      {/* ── Header card ─────────────────────────────── */}
      <div className={styles.card}>
        <div className={styles.card__avatar}>{initials}</div>
        <div className={styles.card__info}>
          <h1 className={styles.card__name}>{user.name ?? user.email}</h1>
          <p className={styles.card__email}>{user.email}</p>
          <span className={`${styles.card__role} ${styles[`card__role--${user.role.toLowerCase()}`]}`}>
            {user.role}
          </span>
        </div>
        {/* Currency toggle */}
        <button className={styles.card__currency} onClick={toggle}>
          {displayCurrency === 'USD' ? '$ USD' : '₽ RUB'}
        </button>
      </div>

      {/* ── Admin panel link ────────────────────────── */}
      {isAdmin && (
        <div className={styles.section}>
          <h2 className={styles.section__title}>Admin</h2>
          <Link href="/admin/listings" className={styles.link__card}>
            <span>📋</span>
            <div>
              <p className={styles.link__card__title}>Pending listings</p>
              <p className={styles.link__card__sub}>Review and approve provider submissions</p>
            </div>
            <span className={styles.link__card__arrow}>›</span>
          </Link>
        </div>
      )}

      {/* ── Provider: my listings ───────────────────── */}
      {(isProvider || isAdmin) && (
        <div className={styles.section}>
          <div className={styles.section__header}>
            <h2 className={styles.section__title}>{t('myListings')}</h2>
            <Link href="/provider/listings/new" className={styles.btn__add}>
              + {t('addListing')}
            </Link>
          </div>

          {!myListings?.length ? (
            <p className={styles.empty}>{t('noListings')}</p>
          ) : (
            <div className={styles.listings}>
              {myListings.map((l: any) => (
                <div key={l.id} className={styles.listing}>
                  <div className={styles.listing__thumb}>
                    {l.media?.[0] ? (
                      <img src={l.media[0].thumbUrl || l.media[0].url} alt={l.title} />
                    ) : (
                      <span>🏠</span>
                    )}
                  </div>
                  <div className={styles.listing__info}>
                    <p className={styles.listing__title}>{l.title}</p>
                    <p className={styles.listing__sub}>{l.city?.name} · {l.category?.name}</p>
                  </div>
                  <span className={`${styles.listing__status} ${l.isPublished ? styles['listing__status--live'] : styles['listing__status--pending']}`}>
                    {l.isPublished ? 'Live' : 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── User: bookings ──────────────────────────── */}
      {user.role === 'USER' && (
        <div className={styles.section}>
          <h2 className={styles.section__title}>{t('myBookings')}</h2>
          {!bookings?.length ? (
            <p className={styles.empty}>{t('noBookings')}</p>
          ) : (
            <div className={styles.listings}>
              {bookings.map((b: any) => (
                <div key={b.id} className={styles.listing}>
                  <div className={styles.listing__thumb}>
                    <span>📅</span>
                  </div>
                  <div className={styles.listing__info}>
                    <p className={styles.listing__title}>{b.listing?.title}</p>
                    <p className={styles.listing__sub}>
                      {new Date(b.checkIn).toLocaleDateString(locale)} → {new Date(b.checkOut).toLocaleDateString(locale)}
                    </p>
                  </div>
                  <span className={`${styles.listing__status} ${styles[`listing__status--${b.status.toLowerCase()}`]}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
