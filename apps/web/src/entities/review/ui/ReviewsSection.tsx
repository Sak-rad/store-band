'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import { Link } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { useAuthStore } from '../../../shared/store/auth.store';
import styles from './ReviewsSection.module.scss';

interface Review {
  id: number;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { id: string; name?: string; avatarUrl?: string };
}

// ── Star picker ───────────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className={styles.starPicker}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          className={`${styles.starPicker__star} ${n <= (hovered || value) ? styles['starPicker__star--on'] : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n}`}
        >★</button>
      ))}
    </div>
  );
}

// ── Single review card ────────────────────────────────────────────────────────

function ReviewCard({ review, isOwn, onEdit, onDelete, t }: {
  review: Review;
  isOwn: boolean;
  onEdit: () => void;
  onDelete: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const date = new Date(review.createdAt).toLocaleDateString(undefined, {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className={`${styles.review} ${isOwn ? styles['review--own'] : ''}`}>
      <div className={styles.review__head}>
        <div className={styles.review__avatar}>
          {review.user.avatarUrl ? (
            <Image src={review.user.avatarUrl} alt={review.user.name ?? ''} fill sizes="40px" style={{ objectFit: 'cover' }} />
          ) : (
            <span>{(review.user.name ?? t('anonymous'))[0].toUpperCase()}</span>
          )}
        </div>
        <div className={styles.review__meta}>
          <p className={styles.review__name}>
            {review.user.name ?? t('anonymous')}
            {isOwn && <span className={styles.review__own}>{t('yourReview')}</span>}
          </p>
          <p className={styles.review__date}>{date}</p>
        </div>
        <div className={styles.review__stars}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < review.rating ? styles['review__star--on'] : styles['review__star--off']}>★</span>
          ))}
        </div>
      </div>

      {review.comment && <p className={styles.review__comment}>{review.comment}</p>}

      {isOwn && (
        <div className={styles.review__actions}>
          <button className={styles.review__edit} onClick={onEdit}>{t('editReview')}</button>
          <button className={styles.review__delete} onClick={onDelete}>{t('deleteReview')}</button>
        </div>
      )}
    </div>
  );
}

// ── Review form ───────────────────────────────────────────────────────────────

type Target = { listingId: number; providerId?: never } | { providerId: number; listingId?: never };

function ReviewForm({ target, existing, onDone, t, tC }: {
  target: Target;
  existing?: Review;
  onDone: () => void;
  t: ReturnType<typeof useTranslations>;
  tC: ReturnType<typeof useTranslations>;
}) {
  const [rating, setRating]   = useState(existing?.rating ?? 0);
  const [comment, setComment] = useState(existing?.comment ?? '');
  const qc = useQueryClient();

  const cacheKey = target.listingId
    ? ['reviews', 'listing', target.listingId]
    : ['reviews', 'provider', target.providerId];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: cacheKey });
    if (target.listingId) qc.invalidateQueries({ queryKey: ['listing', String(target.listingId)] });
    if (target.providerId) qc.invalidateQueries({ queryKey: ['provider', target.providerId] });
  };

  const create = useMutation({
    mutationFn: () => api.post('/reviews', { ...target, rating, comment: comment || undefined }),
    onSuccess: () => { invalidate(); onDone(); },
  });

  const update = useMutation({
    mutationFn: () => api.patch(`/reviews/${existing!.id}`, { rating, comment: comment || undefined }),
    onSuccess: () => { invalidate(); onDone(); },
  });

  const pending = create.isPending || update.isPending;

  return (
    <form
      className={styles.form}
      onSubmit={e => { e.preventDefault(); existing ? update.mutate() : create.mutate(); }}
    >
      <p className={styles.form__label}>{t('rating')}</p>
      <StarPicker value={rating} onChange={setRating} />

      <textarea
        className={styles.form__textarea}
        placeholder={t('commentPlaceholder')}
        value={comment}
        onChange={e => setComment(e.target.value)}
        rows={3}
      />

      <div className={styles.form__row}>
        <button type="submit" className={styles.form__submit} disabled={rating === 0 || pending}>
          {existing ? t('updateReview') : t('submitReview')}
        </button>
        <button type="button" className={styles.form__cancel} onClick={onDone}>
          {tC('cancel')}
        </button>
      </div>
    </form>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type Props =
  | { listingId: number; providerId?: never; reviewCount: number; locale: string; sectionRef?: React.RefObject<HTMLElement | null>; containerRef?: React.RefObject<HTMLDivElement | null> }
  | { providerId: number; listingId?: never; reviewCount: number; locale: string; sectionRef?: React.RefObject<HTMLElement | null>; containerRef?: React.RefObject<HTMLDivElement | null> };

const TAKE = 5;

export function ReviewsSection({ reviewCount, locale, sectionRef, containerRef, ...ids }: Props) {
  const t    = useTranslations('reviews');
  const tC   = useTranslations('common');
  const user = useAuthStore(s => s.user);
  const qc   = useQueryClient();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const [showForm, setShowForm]     = useState(false);
  const [editReview, setEditReview] = useState<Review | null>(null);

  const isListing = 'listingId' in ids && ids.listingId !== undefined;
  const cacheKey  = isListing
    ? ['reviews', 'listing', ids.listingId]
    : ['reviews', 'provider', ids.providerId];

  const baseParams = isListing
    ? { listingId: ids.listingId, lang: locale, take: TAKE }
    : { providerId: ids.providerId, lang: locale, take: TAKE };

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: cacheKey,
    queryFn: ({ pageParam }) =>
      api.get('/reviews', {
        params: { ...baseParams, ...(pageParam ? { cursor: pageParam } : {}) },
      }).then(r => r.data),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });

  const reviews = data?.pages.flatMap(p => p.data) ?? [];
  const total   = data?.pages[0]?.total ?? reviewCount;
  const ownReview = user ? reviews.find(r => r.user.id === user.id) : undefined;

  // IntersectionObserver — root is the sheet scroll container (or viewport)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { root: containerRef?.current ?? null, rootMargin: '150px' },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, containerRef]);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/reviews/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cacheKey });
      if (isListing) qc.invalidateQueries({ queryKey: ['listing', String(ids.listingId)] });
      else qc.invalidateQueries({ queryKey: ['provider', ids.providerId] });
    },
  });

  const openCreate = () => { setEditReview(null); setShowForm(true); };
  const openEdit   = (r: Review) => { setEditReview(r); setShowForm(true); };
  const closeForm  = () => { setShowForm(false); setEditReview(null); };

  const target: Target = isListing
    ? { listingId: ids.listingId as number }
    : { providerId: ids.providerId as number };

  return (
    <section className={styles.section} ref={sectionRef}>
      <div className={styles.section__head}>
        <h2 className={styles.section__title}>
          {t('title')}
          {total > 0 && <span className={styles.section__count}>{total}</span>}
        </h2>

        {user && !ownReview && !showForm && (
          <button className={styles.section__btn} onClick={openCreate}>
            + {t('writeReview')}
          </button>
        )}
      </div>

      {showForm && (
        <ReviewForm target={target} existing={editReview ?? undefined} onDone={closeForm} t={t} tC={tC} />
      )}

      {!user && (
        <p className={styles.loginPrompt}>
          {t('loginToReview')}{' '}
          <Link href="/login" className={styles.loginPrompt__link}>{t('loginLink')}</Link>
        </p>
      )}

      {isLoading && <p className={styles.loading}>{tC('loading')}</p>}
      {!isLoading && reviews.length === 0 && <p className={styles.empty}>{t('noReviews')}</p>}

      <div className={styles.scroll}>
        {reviews.map(r => (
          <ReviewCard
            key={r.id}
            review={r}
            isOwn={r.user.id === user?.id}
            onEdit={() => openEdit(r)}
            onDelete={() => remove.mutate(r.id)}
            t={t}
          />
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {isFetchingNextPage && <p className={styles.loading}>{tC('loading')}</p>}
    </section>
  );
}
