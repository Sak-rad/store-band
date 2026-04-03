'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../navigation';
import { useSearchParams } from 'next/navigation';
import styles from './FilterPanel.module.scss';

const REAL_ESTATE = ['apartments', 'villas'] as const;
const LISTING_TYPES = ['rent', 'buy', 'short-term'] as const;
const SERVICES = ['excursions', 'transport', 'services', 'food', 'healthcare', 'education'] as const;

export function FilterPanel() {
  const t      = useTranslations('listings');
  const tC     = useTranslations('common');
  const router = useRouter();
  const params = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCategory    = params.get('category') ?? '';
  const activeListingType = params.get('listingType') ?? '';
  const hasFilters        = params.toString().length > 0;
  const isRealEstate      = REAL_ESTATE.includes(activeCategory as any);

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/listings?${next.toString()}`);
  };

  const toggleCategory = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    activeCategory === slug ? next.delete('category') : next.set('category', slug);
    router.push(`/listings?${next.toString()}`);
  };

  const toggleListingType = (type: string) => {
    apply('listingType', activeListingType === type ? '' : type);
  };

  const clearAll = () => {
    router.push('/listings');
    setMobileOpen(false);
  };

  const filterContent = (
    <div className={styles.filter}>
      <div className={styles.filter__head}>
        <h3 className={styles.filter__title}>{tC('filters')}</h3>
        <div className={styles.filter__head__right}>
          {hasFilters && (
            <button className={styles.filter__clear} onClick={clearAll}>
              {tC('clearAll')}
            </button>
          )}
          {/* Close button — mobile only */}
          <button
            className={styles.filter__close}
            onClick={() => setMobileOpen(false)}
            aria-label="Close filters"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Real Estate ─────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>{t('realEstate')}</p>
        <div className={styles.filter__chips}>
          {REAL_ESTATE.map((slug) => (
            <button
              key={slug}
              className={`${styles.filter__chip} ${activeCategory === slug ? styles['filter__chip--active'] : ''}`}
              onClick={() => toggleCategory(slug)}
            >
              {t(`categories.${slug}`)}
            </button>
          ))}
        </div>

        {isRealEstate && (
          <div className={styles.filter__subrow}>
            {LISTING_TYPES.map((type) => (
              <button
                key={type}
                className={`${styles.filter__chip} ${styles['filter__chip--sm']} ${activeListingType === type ? styles['filter__chip--active'] : ''}`}
                onClick={() => toggleListingType(type)}
              >
                {t(`listingType.${type}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Services ────────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>{t('services')}</p>
        <div className={styles.filter__chips}>
          {SERVICES.map((slug) => (
            <button
              key={slug}
              className={`${styles.filter__chip} ${activeCategory === slug ? styles['filter__chip--active'] : ''}`}
              onClick={() => toggleCategory(slug)}
            >
              {t(`categories.${slug}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Price ───────────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>{t('filterPrice')} (USD)</p>
        <div className={styles.filter__price}>
          <input
            type="number"
            placeholder="min"
            defaultValue={params.get('priceMin') ?? ''}
            onBlur={(e) => apply('priceMin', e.target.value)}
          />
          <span>—</span>
          <input
            type="number"
            placeholder="max"
            defaultValue={params.get('priceMax') ?? ''}
            onBlur={(e) => apply('priceMax', e.target.value)}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile toggle bar ── */}
      <button
        className={`${styles.filter__toggle} ${hasFilters ? styles['filter__toggle--active'] : ''}`}
        onClick={() => setMobileOpen(true)}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {tC('filters')}
        {hasFilters && <span className={styles.filter__toggle__dot} />}
      </button>

      {/* ── Desktop panel (sticky left) ── */}
      <div className={styles.filter__desktop}>
        {filterContent}
      </div>

      {/* ── Mobile overlay + bottom sheet ── */}
      {mobileOpen && (
        <div className={styles.filter__overlay} onClick={() => setMobileOpen(false)}>
          <div
            className={styles.filter__sheet}
            onClick={(e) => e.stopPropagation()}
          >
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
}
