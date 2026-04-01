'use client';

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

  const activeCategory    = params.get('category') ?? '';
  const activeListingType = params.get('listingType') ?? '';

  const apply = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/listings?${next.toString()}`);
  };

  const toggleCategory = (slug: string) => {
    const next = new URLSearchParams(params.toString());
    if (activeCategory === slug) {
      next.delete('category');
    } else {
      next.set('category', slug);
    }
    router.push(`/listings?${next.toString()}`);
  };

  const toggleListingType = (type: string) => {
    apply('listingType', activeListingType === type ? '' : type);
  };

  const clearAll = () => router.push('/listings');
  const hasFilters = params.toString().length > 0;

  const isRealEstate = REAL_ESTATE.includes(activeCategory as any);

  return (
    <div className={styles.filter}>
      <div className={styles.filter__head}>
        <h3 className={styles.filter__title}>{tC('filters')}</h3>
        {hasFilters && (
          <button className={styles.filter__clear} onClick={clearAll}>
            {tC('clearAll')}
          </button>
        )}
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

        {/* Listing type sub-filter (only relevant for real estate) */}
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

      {/* ── Price (USD) ──────────────────────────────── */}
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
}
