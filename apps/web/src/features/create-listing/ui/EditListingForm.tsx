'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';
import { useRouter } from '../../../navigation';
import { api } from '../../../shared/lib/api';
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
  categoryId: number;
  countryId: number;
  cityId: number;
  address: string;
}

interface Country  { id: number; name: string }
interface City     { id: number; name: string }
interface Category { id: number; name: string; slug: string; parentId: number | null }

interface Props { locale: string; listingId: string }

export function EditListingForm({ locale, listingId }: Props) {
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [countries, setCountries]   = useState<Country[]>([]);
  const [cities, setCities]         = useState<City[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(true);

  const [photos, setPhotos]       = useState<{ url: string; preview: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: { currency: 'USD', listingType: 'rent', priceOnRequest: false },
  });

  const selectedCountry = watch('countryId');
  const priceOnRequest  = watch('priceOnRequest');

  // Load static data + existing listing
  useEffect(() => {
    Promise.all([
      api.get('/countries').then(r => r.data),
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
        categoryId: listing.categoryId,
        countryId: listing.countryId,
        cityId: listing.cityId,
        address: listing.address ?? '',
      });

      if (listing.media?.length) {
        setPhotos(listing.media.map((m: any) => ({ url: m.url, preview: m.thumbUrl || m.url })));
      }

      // Load cities for selected country
      api.get(`/countries/${listing.countryId}/cities`).then(r => setCities(r.data));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [listingId, locale, reset]);

  useEffect(() => {
    if (selectedCountry) {
      api.get(`/countries/${selectedCountry}/cities`).then(r => setCities(r.data));
    }
  }, [selectedCountry]);

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
      setError('Failed to upload one or more photos');
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
      await api.patch(`/listings/${listingId}`, {
        titleI18n:       { en: data.titleEn, ru: data.titleRu },
        descriptionI18n: { en: data.descriptionEn, ru: data.descriptionRu },
        priceOnRequest:  data.priceOnRequest,
        priceMin:        data.priceOnRequest ? 0 : Number(data.priceMin),
        currency:        data.currency,
        listingType:     data.listingType,
        categoryId:      Number(data.categoryId),
        cityId:          Number(data.cityId),
        countryId:       Number(data.countryId),
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
    return <div className={styles.page}><p style={{ color: 'var(--color-text-muted)' }}>Loading...</p></div>;
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.success}>
          <span>✅</span>
          <h2>Listing updated</h2>
          <p>Your changes have been submitted for review.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.header__title}>Edit Listing</h1>
        <p className={styles.header__sub}>Changes will be reviewed by admin before going live.</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* ── Titles ─────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📝 English</h3>
          <div className={styles.form__field}>
            <label>Title (EN)</label>
            <input {...register('titleEn', { required: 'Required' })} placeholder="e.g. Modern studio near the beach" />
            {errors.titleEn && <span className={styles.form__error}>{errors.titleEn.message}</span>}
          </div>
          <div className={styles.form__field}>
            <label>Description (EN)</label>
            <textarea {...register('descriptionEn', { required: 'Required' })} rows={4} />
            {errors.descriptionEn && <span className={styles.form__error}>{errors.descriptionEn.message}</span>}
          </div>
        </div>

        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📝 Русский</h3>
          <div className={styles.form__field}>
            <label>Заголовок (RU)</label>
            <input {...register('titleRu', { required: 'Обязательно' })} />
            {errors.titleRu && <span className={styles.form__error}>{errors.titleRu.message}</span>}
          </div>
          <div className={styles.form__field}>
            <label>Описание (RU)</label>
            <textarea {...register('descriptionRu', { required: 'Обязательно' })} rows={4} />
            {errors.descriptionRu && <span className={styles.form__error}>{errors.descriptionRu.message}</span>}
          </div>
        </div>

        {/* ── Price & Type ────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>💰 Price</h3>
          <div className={styles.form__field}>
            <label className={styles.form__checkbox}>
              <input type="checkbox" {...register('priceOnRequest')} />
              <span>Price on request / По договорённости</span>
            </label>
          </div>
          <div className={styles.form__row}>
            <div className={styles.form__field}>
              <label>Price (USD/month)</label>
              <input
                type="number"
                min="0"
                disabled={priceOnRequest}
                {...register('priceMin', { required: !priceOnRequest && 'Required', min: 1 })}
                placeholder={priceOnRequest ? 'По договорённости' : 'e.g. 800'}
                className={priceOnRequest ? styles['form__input--disabled'] : ''}
              />
              {errors.priceMin && !priceOnRequest && <span className={styles.form__error}>{errors.priceMin.message}</span>}
            </div>
            <div className={styles.form__field}>
              <label>Listing type</label>
              <select {...register('listingType')}>
                <option value="rent">Rent</option>
                <option value="buy">Buy / Sale</option>
                <option value="short-term">Short-term</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Photos ──────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📷 Photos</h3>
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
              {uploading ? 'Uploading...' : '+ Add photos'}
            </label>
          </div>
          {photos.length > 0 && (
            <div className={styles.uploader__grid}>
              {photos.map((p, i) => (
                <div key={i} className={styles.uploader__thumb}>
                  <img src={p.preview} alt={`photo ${i + 1}`} />
                  <button type="button" className={styles.uploader__remove} onClick={() => removePhoto(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Category ────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>🏷 Category</h3>
          <div className={styles.form__field}>
            <label>Category</label>
            <select {...register('categoryId', { required: 'Required' })}>
              <option value="">Select category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {errors.categoryId && <span className={styles.form__error}>{errors.categoryId.message}</span>}
          </div>
        </div>

        {/* ── Location ─────────────────────────────────── */}
        <div className={styles.form__section}>
          <h3 className={styles.form__section__title}>📍 Location</h3>
          <div className={styles.form__row}>
            <div className={styles.form__field}>
              <label>Country</label>
              <select {...register('countryId', { required: 'Required' })}>
                <option value="">Select country</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.countryId && <span className={styles.form__error}>{errors.countryId.message}</span>}
            </div>
            <div className={styles.form__field}>
              <label>City</label>
              <select {...register('cityId', { required: 'Required' })} disabled={!selectedCountry}>
                <option value="">Select city</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.cityId && <span className={styles.form__error}>{errors.cityId.message}</span>}
            </div>
          </div>
          <div className={styles.form__field}>
            <label>Address</label>
            <input {...register('address')} placeholder="e.g. 12 Beach Road, District 1" />
          </div>
        </div>

        {error && <p className={styles.form__root_error}>{error}</p>}

        <div className={styles.form__footer}>
          <button type="button" className={styles.form__back} onClick={() => router.back()}>
            ← Back
          </button>
          <button type="submit" className={styles.form__submit} disabled={isSubmitting || uploading}>
            {isSubmitting ? tCommon('loading') : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
