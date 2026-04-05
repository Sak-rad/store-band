'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
import { Select } from '../../../shared/ui/Select';
import { Checkbox } from '../../../shared/ui/Checkbox';
import { GeoSelect } from '../../../shared/ui/GeoSelect';
import type { GeoItem } from '../../../shared/ui/GeoSelect';
import styles from './CreateListingForm.module.scss';

interface FormData {
  titleEn: string;
  titleRu: string;
  descriptionEn: string;
  descriptionRu: string;
  priceMin: number;
  priceOnRequest: boolean;
  currency: string;
  listingType: string;
  isShortTermAvailable: boolean;
  categoryId: string;
  countryId: string;
  cityId: string;
  address: string;
}

interface Category { id: number; name: string; slug: string; parentId: number | null }

interface Props { locale: string; listingId: string }

export function EditListingForm({ locale, listingId }: Props) {
  const t = useTranslations('provider');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [countries, setCountries]   = useState<GeoItem[]>([]);
  const [cities, setCities]         = useState<GeoItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(true);

  const [photos, setPhotos]       = useState<{ url: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { currency: 'USD', listingType: 'rent', isShortTermAvailable: false, priceOnRequest: false, countryId: '', cityId: '', categoryId: '' },
  });

  const priceOnRequest       = watch('priceOnRequest');
  const countryId            = watch('countryId');
  const listingType          = watch('listingType');
  const isShortTermAvailable = watch('isShortTermAvailable');

  useEffect(() => {
    Promise.all([
      api.get('/countries', { params: { lang: locale } }).then(r => r.data),
      api.get('/categories').then(r => r.data),
      api.get(`/listings/${listingId}`, { params: { lang: locale } }).then(r => r.data),
    ]).then(([countriesData, catsData, listing]) => {
      setCountries(countriesData);
      setCategories(catsData.filter((c: Category) => c.parentId !== null || catsData.every((p: Category) => p.id !== c.parentId)));

      reset({
        titleEn: (listing.titleI18n as any)?.en ?? listing.title,
        titleRu: (listing.titleI18n as any)?.ru ?? listing.title,
        descriptionEn: (listing.descriptionI18n as any)?.en ?? listing.description,
        descriptionRu: (listing.descriptionI18n as any)?.ru ?? listing.description,
        priceMin: listing.priceMin,
        priceOnRequest: listing.priceOnRequest,
        currency: listing.currency,
        listingType: listing.listingType,
        isShortTermAvailable: listing.isShortTermAvailable ?? false,
        categoryId: String(listing.categoryId),
        countryId: listing.country?.slug ?? '',
        cityId: listing.city?.slug ?? '',
        address: listing.address ?? '',
      });

      if (listing.media?.length) {
        setPhotos(listing.media.map((m: any) => ({ url: m.url, preview: m.thumbUrl || m.url })));
      }

      if (listing.country?.slug) {
        api.get(`/countries/${listing.country.slug}/cities`, { params: { lang: locale } }).then(r => setCities(r.data));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [listingId, locale, reset]);

  useEffect(() => {
    if (countryId) {
      api.get(`/countries/${countryId}/cities`, { params: { lang: locale } }).then(r => setCities(r.data)).catch(() => {});
    } else {
      setCities([]);
    }
  }, [countryId, locale]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = await Promise.all(
        files.map(async (file) => {
          const preview = URL.createObjectURL(file);
          const form = new FormData();
          form.append('file', file);
          const res = await api.post('/uploads/image', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          return { url: res.data.url as string, preview };
        }),
      );
      setPhotos(prev => [...prev, ...uploaded]);
    } catch {
      setError('Failed to upload photos');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removePhoto = (idx: number) => setPhotos(prev => prev.filter((_, i) => i !== idx));

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError('');
    try {
      const countryRecord = countries.find(c => c.slug === data.countryId);
      const cityRecord    = cities.find(c => c.slug === data.cityId);
      await api.patch(`/listings/${listingId}`, {
        titleI18n:       { en: data.titleEn, ru: data.titleRu },
        descriptionI18n: { en: data.descriptionEn, ru: data.descriptionRu },
        priceOnRequest:  data.priceOnRequest,
        priceMin:        data.priceOnRequest ? 0 : Number(data.priceMin),
        currency:        data.currency,
        listingType:          data.listingType,
        isShortTermAvailable: data.listingType === 'rent' ? data.isShortTermAvailable : false,
        categoryId:           Number(data.categoryId),
        cityId:          cityRecord?.id,
        countryId:       countryRecord?.id,
        address:         data.address,
        photoUrls:       photos.map(p => p.url),
      });
      setSuccess(true);
      setTimeout(() => router.push('/profile'), 1800);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? tCommon('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <div className={styles.page}><p style={{ color: 'var(--color-text-muted)', padding: '2rem' }}>{tCommon('loading')}</p></div>;
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <span>✅</span>
          <h2>{t('listingUpdated')}</h2>
          <p>{t('listingUpdatedApproval')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.header__title}>{t('editListing')}</h1>
        <p className={styles.header__sub}>{t('editListingHint')}</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── English ────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📝 {t('listingFormTabEn')}</h3>
          <div className={styles.form__field}>
            <label>{t('titleEn')}</label>
            <input {...register('titleEn', { required: tCommon('error') })} placeholder={t('titleEnPlaceholder')} />
            {errors.titleEn && <span className={styles.form__error}>{errors.titleEn.message}</span>}
          </div>
          <div className={styles.form__field}>
            <label>{t('descriptionEn')}</label>
            <textarea {...register('descriptionEn', { required: tCommon('error') })} rows={4} placeholder={t('descriptionEnPlaceholder')} />
            {errors.descriptionEn && <span className={styles.form__error}>{errors.descriptionEn.message}</span>}
          </div>
        </div>

        {/* ── Russian ────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📝 {t('listingFormTabRu')}</h3>
          <div className={styles.form__field}>
            <label>{t('titleRu')}</label>
            <input {...register('titleRu', { required: tCommon('error') })} placeholder={t('titleRuPlaceholder')} />
            {errors.titleRu && <span className={styles.form__error}>{errors.titleRu.message}</span>}
          </div>
          <div className={styles.form__field}>
            <label>{t('descriptionRu')}</label>
            <textarea {...register('descriptionRu', { required: tCommon('error') })} rows={4} placeholder={t('descriptionRuPlaceholder')} />
            {errors.descriptionRu && <span className={styles.form__error}>{errors.descriptionRu.message}</span>}
          </div>
        </div>

        {/* ── Price ──────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>💰 {t('priceSection')}</h3>
          <div className={styles.form__field}>
            <Checkbox
              checked={!!priceOnRequest}
              onChange={v => setValue('priceOnRequest', v)}
              label={t('priceOnRequest')}
            />
          </div>
          <div className={styles.form__row}>
            <div className={styles.form__field}>
              <label>{t('priceUsd')}</label>
              <input
                type="number"
                min="0"
                disabled={priceOnRequest}
                {...register('priceMin', { required: !priceOnRequest && tCommon('error'), min: 1 })}
                placeholder={priceOnRequest ? t('priceOnRequest') : t('pricePlaceholder')}
                className={priceOnRequest ? styles['form__input--disabled'] : ''}
              />
              {errors.priceMin && !priceOnRequest && <span className={styles.form__error}>{errors.priceMin.message}</span>}
            </div>
            <div className={styles.form__field}>
              <label>
                {t('listingType')}
                {listingType === 'rent' && (
                  <span className={styles.form__tip}>
                    ?
                    <span className={styles['form__tip-body']}>{t('shortTermRentDisclaimer')}</span>
                  </span>
                )}
              </label>
              <Controller
                name="listingType"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onChange={field.onChange}
                    options={[
                      { value: 'rent',       label: t('typeRent') },
                      { value: 'buy',        label: t('typeBuy') },
                      { value: 'short-term', label: t('typeShortTerm') },
                    ]}
                  />
                )}
              />
              {listingType === 'short-term' && (
                <p className={styles.form__callout}>{t('shortTermDisclaimer')}</p>
              )}
            </div>
          </div>
          {listingType === 'rent' && (
            <div className={styles.form__field}>
              <Checkbox
                checked={!!isShortTermAvailable}
                onChange={v => setValue('isShortTermAvailable', v)}
                label={t('isShortTermAvailable')}
                hint={t('isShortTermAvailableHint')}
              />
            </div>
          )}
        </div>

        {/* ── Photos ─────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📷 {t('photosSection')}</h3>
          <div className={styles.uploader}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              id="photo-upload"
              className={styles.uploader__input}
              onChange={handleFileChange}
            />
            <label htmlFor="photo-upload" className={styles.uploader__label}>
              {uploading ? tCommon('loading') : t('addPhotos')}
            </label>
          </div>
          {photos.length > 0 && (
            <div className={styles.uploader__grid}>
              {photos.map((p, i) => (
                <div key={i} className={styles.uploader__thumb}>
                  <img src={p.preview} alt="" />
                  <button type="button" className={styles.uploader__remove} onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Category ───────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>🏷 {t('categorySection')}</h3>
          <div className={styles.form__field}>
            <label>{t('categorySection')}</label>
            <Controller
              name="categoryId"
              control={control}
              rules={{ required: tCommon('error') }}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  options={categories.map(c => ({ value: String(c.id), label: c.name }))}
                  placeholder={t('selectCategory')}
                  error={!!errors.categoryId}
                />
              )}
            />
            {errors.categoryId && <span className={styles.form__error}>{errors.categoryId.message}</span>}
          </div>
        </div>

        {/* ── Location ───────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📍 {t('locationSection')}</h3>
          <div className={styles.form__row}>
            <div className={styles.form__field}>
              <label>{tCommon('location')}</label>
              <Controller
                name="countryId"
                control={control}
                rules={{ required: tCommon('error') }}
                render={({ field }) => (
                  <GeoSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={countries}
                    placeholder={t('selectCountry')}
                    searchPlaceholder={t('searchHere')}
                    emptyLabel={t('nothingFound')}
                  />
                )}
              />
              {errors.countryId && <span className={styles.form__error}>{errors.countryId.message}</span>}
            </div>
            <div className={styles.form__field}>
              <label>{t('selectCity')}</label>
              <Controller
                name="cityId"
                control={control}
                rules={{ required: tCommon('error') }}
                render={({ field }) => (
                  <GeoSelect
                    value={field.value}
                    onChange={field.onChange}
                    options={cities}
                    placeholder={t('selectCity')}
                    searchPlaceholder={t('searchHere')}
                    emptyLabel={t('nothingFound')}
                    disabled={!countryId}
                  />
                )}
              />
              {errors.cityId && <span className={styles.form__error}>{errors.cityId.message}</span>}
            </div>
          </div>
          <div className={styles.form__field}>
            <label>{t('address')}</label>
            <input {...register('address')} placeholder={t('addressPlaceholder')} />
          </div>
        </div>

        {error && <p className={styles.form__root_error}>{error}</p>}

        <div className={styles.form__footer}>
          <button type="button" className={styles.form__back} onClick={() => router.back()}>
            {t('back')}
          </button>
          <button type="submit" className={styles.form__submit} disabled={isSubmitting || uploading}>
            {isSubmitting ? tCommon('loading') : t('saveChanges')}
          </button>
        </div>
      </form>
    </div>
  );
}
