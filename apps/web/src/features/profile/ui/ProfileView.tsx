'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../../shared/store/auth.store';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { Link } from '../../../navigation';
import styles from './ProfileView.module.scss';

interface Props { locale: string }

function listingStatus(l: any): 'live' | 'pending' | 'inactive' | 'hidden' {
  if (!l.isActive) return 'inactive';
  if (l.isPublished) return 'live';
  return 'pending';
}

const STATUS_LABEL: Record<string, string> = {
  live: 'Live',
  pending: 'Pending',
  inactive: 'Hidden',
};

export function ProfileView({ locale }: Props) {
  const t = useTranslations('profile');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const { displayCurrency, toggle } = useCurrencyStore();
  const qc = useQueryClient();

  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: myListings } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => api.get('/listings/my').then(r => r.data),
    enabled: user?.role === 'PROVIDER' || user?.role === 'ADMIN',
  });

  const { data: bookings } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => api.get('/bookings').then(r => r.data),
    enabled: !!user,
  });

  const toggleActive = useMutation({
    mutationFn: (id: number) => api.patch(`/listings/${id}/toggle-active`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-listings'] }),
  });

  const deleteListing = useMutation({
    mutationFn: (id: number) => api.delete(`/listings/${id}`),
    onSuccess: () => {
      setConfirmDelete(null);
      qc.invalidateQueries({ queryKey: ['my-listings'] });
    },
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
              {myListings.map((l: any) => {
                const status = listingStatus(l);
                return (
                  <div key={l.id} className={`${styles.listing} ${!l.isActive ? styles['listing--inactive'] : ''}`}>
                    <div className={styles.listing__thumb}>
                      {l.media?.[0] ? (
                        <img src={l.media[0].thumbUrl || l.media[0].url} alt={l.title} />
                      ) : (
                        <span>🏠</span>
                      )}
                    </div>

                    <div className={styles.listing__info}>
                      <p className={styles.listing__title}>{l.title}</p>
                      <p className={styles.listing__sub}>
                        {l.city?.name}{l.city && l.category ? ' · ' : ''}{l.category?.name}
                      </p>
                    </div>

                    <span className={`${styles.listing__status} ${styles[`listing__status--${status}`]}`}>
                      {STATUS_LABEL[status]}
                    </span>

                    <div className={styles.listing__actions}>
                      {/* Edit */}
                      <Link
                        href={`/provider/listings/${l.id}/edit`}
                        className={styles.listing__btn}
                        title="Edit"
                      >
                        ✏️
                      </Link>

                      {/* Toggle active */}
                      <button
                        className={`${styles.listing__btn} ${l.isActive ? styles['listing__btn--active'] : styles['listing__btn--hidden']}`}
                        onClick={() => toggleActive.mutate(l.id)}
                        title={l.isActive ? 'Hide listing' : 'Show listing'}
                        disabled={toggleActive.isPending}
                      >
                        {l.isActive ? '👁' : '🙈'}
                      </button>

                      {/* Delete */}
                      <button
                        className={`${styles.listing__btn} ${styles['listing__btn--delete']}`}
                        onClick={() => setConfirmDelete(l.id)}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* ── Delete confirmation dialog ──────────────── */}
      {confirmDelete !== null && (
        <div className={styles.dialog__overlay}>
          <div className={styles.dialog}>
            <p className={styles.dialog__text}>Delete this listing? This cannot be undone.</p>
            <div className={styles.dialog__actions}>
              <button className={styles.dialog__cancel} onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                className={styles.dialog__confirm}
                onClick={() => deleteListing.mutate(confirmDelete)}
                disabled={deleteListing.isPending}
              >
                {deleteListing.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
