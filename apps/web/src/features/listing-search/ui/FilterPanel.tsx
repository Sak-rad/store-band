'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from '../../../navigation';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../shared/lib/api';
import { useCurrencyStore } from '../../../shared/store/currency.store';
import { GeoSelect } from '../../../shared/ui/GeoSelect';
import type { GeoItem } from '../../../shared/ui/GeoSelect';
import {
  parseSegments,
  buildListingsPath,
} from '../../../shared/lib/listing-segments';
import styles from './FilterPanel.module.scss';

const REAL_ESTATE_PARENT = 'real-estate';
const REAL_ESTATE_CHILDREN = ['apartments', 'villas'] as const;
const LISTING_TYPES = ['rent', 'buy', 'short-term'] as const;
const SERVICES = ['excursions', 'transport', 'services', 'food', 'healthcare', 'education'] as const;

function extractSegments(pathname: string): string[] {
  const match = pathname.match(/\/listings\/(.+)/);
  return match ? match[1].split('/').filter(Boolean) : [];
}

type Filters = ReturnType<typeof parseSegments>;

export function FilterPanel() {
  const t         = useTranslations('listings');
  const tC        = useTranslations('common');
  const router    = useRouter();
  const pathname  = usePathname();
  const searchParams = useSearchParams();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [countries, setCountries]   = useState<GeoItem[]>([]);
  const [cities, setCities]         = useState<GeoItem[]>([]);

  const displayCurrency = useCurrencyStore(s => s.displayCurrency);
  const usdToRub        = useCurrencyStore(s => s.usdToRub);

  // Convert URL value (always USD) → display currency for input default
  const toDisplay = (usdStr: string | null): string => {
    if (!usdStr) return '';
    return displayCurrency === 'RUB'
      ? String(Math.round(Number(usdStr) * usdToRub))
      : usdStr;
  };

  // Convert display currency value → USD for URL/backend
  const toUsd = (value: string): string => {
    if (!value) return '';
    return displayCurrency === 'RUB'
      ? String(Math.round(Number(value) / usdToRub))
      : value;
  };

  // Filters from URL — source of truth for desktop
  const urlFilters = parseSegments(extractSegments(pathname));

  // Pending filters — used while mobile sheet is open (no navigation until Apply)
  const [pending, setPending] = useState<Filters>(urlFilters);

  // Sync pending when sheet closes or URL changes externally
  useEffect(() => {
    if (!mobileOpen) setPending(urlFilters);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mobileOpen]);

  const hasFilters = extractSegments(pathname).length > 0 || searchParams.toString().length > 0;

  // Load cities for the currently-relevant country
  const relevantCountry = mobileOpen ? pending.country : urlFilters.country;
  useEffect(() => {
    if (relevantCountry) {
      api.get(`/countries/${relevantCountry}/cities`).then(r => setCities(r.data)).catch(() => {});
    } else {
      setCities([]);
    }
  }, [relevantCountry]);

  useEffect(() => {
    api.get('/countries').then(r => setCountries(r.data)).catch(() => {});
  }, []);

  // Desktop navigates immediately; mobile updates pending only
  const applyFilters = (updated: Filters) => {
    const path = buildListingsPath(updated);
    const qs   = searchParams.toString();
    router.push(qs ? `${path}?${qs}` : path);
  };

  const updateFilter = (patch: Partial<Filters>) => {
    if (mobileOpen) {
      setPending(prev => ({ ...prev, ...patch }));
    } else {
      applyFilters({ ...urlFilters, ...patch });
    }
  };

  const applyAndClose = () => {
    applyFilters(pending);
    setMobileOpen(false);
  };

  const openSheet = () => {
    setPending(urlFilters); // reset pending to current URL state
    setMobileOpen(true);
  };

  const closeSheet = () => setMobileOpen(false);

  const clearAll = () => {
    router.push('/listings');
    setMobileOpen(false);
  };

  const applyPrice = (key: 'priceMin' | 'priceMax', value: string) => {
    const path   = buildListingsPath(urlFilters);
    const qs     = new URLSearchParams(searchParams.toString());
    const usdVal = toUsd(value);
    if (usdVal) qs.set(key, usdVal); else qs.delete(key);
    router.push(qs.toString() ? `${path}?${qs.toString()}` : path);
  };

  // Which filters to display in the sheet
  const display = mobileOpen ? pending : urlFilters;
  const isRealEstate = display.category === REAL_ESTATE_PARENT || REAL_ESTATE_CHILDREN.includes(display.category as any);

  const filterContent = (
    <div className={styles.filter}>
      <div className={styles.filter__head}>
        <h3 className={styles.filter__title}>{tC('filters')}</h3>
        <div className={styles.filter__head__right}>
          {hasFilters && (
            <button className={styles.filter__clear} onClick={clearAll}>{tC('clearAll')}</button>
          )}
          <button className={styles.filter__close} onClick={closeSheet} aria-label="Close">✕</button>
        </div>
      </div>

      {/* ── Location ────────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>📍 {tC('location')}</p>
        <div className={styles.filter__section__selects}>
          <GeoSelect
            value={display.country ?? ''}
            onChange={v => updateFilter({ country: v || undefined, city: undefined })}
            options={countries}
            placeholder={tC('allCountries')}
          />
          {display.country && (
            <GeoSelect
              value={display.city ?? ''}
              onChange={v => updateFilter({ city: v || undefined })}
              options={cities}
              placeholder={tC('allCities')}
            />
          )}
        </div>
      </div>

      {/* ── Real Estate ─────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>{t('realEstate')}</p>
        <div className={styles.filter__chips}>
          {/* Parent chip: shows both apartments + villas */}
          <button
            className={`${styles.filter__chip} ${display.category === REAL_ESTATE_PARENT ? styles['filter__chip--active'] : ''}`}
            onClick={() => updateFilter({ category: display.category === REAL_ESTATE_PARENT ? undefined : REAL_ESTATE_PARENT, listingType: undefined })}
          >
            {t('categories.real-estate')}
          </button>
          {/* Child chips: apartments / villas */}
          {REAL_ESTATE_CHILDREN.map(slug => (
            <button
              key={slug}
              className={`${styles.filter__chip} ${display.category === slug ? styles['filter__chip--active'] : ''}`}
              onClick={() => updateFilter({ category: display.category === slug ? undefined : slug })}
            >
              {t(`categories.${slug}`)}
            </button>
          ))}
        </div>
        {isRealEstate && (
          <div className={styles.filter__subrow}>
            {LISTING_TYPES.map(type => (
              <button
                key={type}
                className={`${styles.filter__chip} ${styles['filter__chip--sm']} ${display.listingType === type ? styles['filter__chip--active'] : ''}`}
                onClick={() => updateFilter({ listingType: display.listingType === type ? undefined : type })}
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
          {SERVICES.map(slug => (
            <button
              key={slug}
              className={`${styles.filter__chip} ${display.category === slug ? styles['filter__chip--active'] : ''}`}
              onClick={() => updateFilter({ category: display.category === slug ? undefined : slug })}
            >
              {t(`categories.${slug}`)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Price ───────────────────────────────────── */}
      <div className={styles.filter__section}>
        <p className={styles.filter__section__label}>
          {t('filterPrice')} ({displayCurrency === 'RUB' ? '₽' : '$'})
        </p>
        <div className={styles.filter__price}>
          <input
            key={`min-${displayCurrency}`}
            type="number"
            placeholder="min"
            defaultValue={toDisplay(searchParams.get('priceMin'))}
            onKeyDown={e => e.key === 'Enter' && applyPrice('priceMin', (e.target as HTMLInputElement).value)}
          />
          <span>—</span>
          <input
            key={`max-${displayCurrency}`}
            type="number"
            placeholder="max"
            defaultValue={toDisplay(searchParams.get('priceMax'))}
            onKeyDown={e => e.key === 'Enter' && applyPrice('priceMax', (e.target as HTMLInputElement).value)}
          />
        </div>
      </div>

      {/* ── Apply (mobile only) ──────────────────────── */}
      {mobileOpen && (
        <div className={styles.filter__apply}>
          <button className={styles.filter__apply__btn} onClick={applyAndClose}>
            {tC('search')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        className={`${styles.filter__toggle} ${hasFilters ? styles['filter__toggle--active'] : ''}`}
        onClick={openSheet}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        {tC('filters')}
        {hasFilters && <span className={styles.filter__toggle__dot} />}
      </button>

      <div className={styles.filter__desktop}>{filterContent}</div>

      {mobileOpen && (
        <div className={styles.filter__overlay} onClick={closeSheet}>
          <div className={styles.filter__sheet} onClick={e => e.stopPropagation()}>
            {filterContent}
          </div>
        </div>
      )}
    </>
  );
}
