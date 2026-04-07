'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CountryPreference, useLocationStore } from '../store/location.store';
import styles from './LocationBanner.module.scss';

const ALL_COUNTRIES: CountryPreference[] = [
  { name: 'Thailand',   nameRu: 'Таиланд',   code: 'TH', slug: 'thailand',   emoji: '🇹🇭' },
  { name: 'Vietnam',    nameRu: 'Вьетнам',   code: 'VN', slug: 'vietnam',    emoji: '🇻🇳' },
  { name: 'Indonesia',  nameRu: 'Индонезия', code: 'ID', slug: 'indonesia',  emoji: '🇮🇩' },
  { name: 'UAE',        nameRu: 'ОАЭ',       code: 'AE', slug: 'uae',        emoji: '🇦🇪' },
  { name: 'Georgia',    nameRu: 'Грузия',    code: 'GE', slug: 'georgia',    emoji: '🇬🇪' },
  { name: 'Armenia',    nameRu: 'Армения',   code: 'AM', slug: 'armenia',    emoji: '🇦🇲' },
  { name: 'Serbia',     nameRu: 'Сербия',    code: 'RS', slug: 'serbia',     emoji: '🇷🇸' },
  { name: 'Malaysia',   nameRu: 'Малайзия',  code: 'MY', slug: 'malaysia',   emoji: '🇲🇾' },
  { name: 'Portugal',   nameRu: 'Португалия', code: 'PT', slug: 'portugal',  emoji: '🇵🇹' },
  { name: 'Turkey',     nameRu: 'Турция',    code: 'TR', slug: 'turkey',     emoji: '🇹🇷' },
  { name: 'Cyprus',     nameRu: 'Кипр',      code: 'CY', slug: 'cyprus',     emoji: '🇨🇾' },
  { name: 'Montenegro', nameRu: 'Черногория', code: 'ME', slug: 'montenegro', emoji: '🇲🇪' },
];

interface Props { locale: string }

export function LocationBanner({ locale }: Props) {
  const t = useTranslations('location');
  const {
    country, detectedCountry,
    bannerDismissed, cookieConsent,
    setCountry, setDetectedCountry, dismissBanner,
  } = useLocationStore();

  const [visible, setVisible] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  // Загружаем геолокацию только после принятия куков
  useEffect(() => {
    if (cookieConsent !== 'accepted') return;
    if (country || bannerDismissed || detectedCountry !== null) return;

    fetch('/api/geo')
      .then(r => r.json())
      .then(data => {
        setDetectedCountry(data.country ?? null);
        if (!bannerDismissed) {
          setTimeout(() => setVisible(true), 500);
        }
      })
      .catch(() => {
        setDetectedCountry(null);
      });
  }, [cookieConsent]);

  // Если уже выбрана страна или баннер закрыт — не показываем
  if (cookieConsent !== 'accepted' || country || bannerDismissed || !visible) return null;

  const suggested = detectedCountry;

  const confirm = (c: CountryPreference) => {
    setCountry(c);
    setVisible(false);
  };

  const dismiss = () => {
    dismissBanner();
    setVisible(false);
  };

  const countryName = (c: CountryPreference) =>
    locale === 'ru' ? c.nameRu : c.name;

  return (
    <div className={styles.banner}>
      <button className={styles.banner__close} onClick={dismiss} aria-label="Close">✕</button>

      {!showPicker ? (
        <>
          <div className={styles.banner__icon}>📍</div>
          <div className={styles.banner__body}>
            {suggested ? (
              <>
                <p className={styles.banner__title}>
                  {suggested.emoji} {t('detected', { country: countryName(suggested) })}
                </p>
                <p className={styles.banner__sub}>{t('detectedSub')}</p>
                <div className={styles.banner__actions}>
                  <button className={styles.banner__confirm} onClick={() => confirm(suggested)}>
                    {t('yes')}
                  </button>
                  <button className={styles.banner__change} onClick={() => setShowPicker(true)}>
                    {t('change')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className={styles.banner__title}>{t('noDetect')}</p>
                <p className={styles.banner__sub}>{t('noDetectSub')}</p>
                <div className={styles.banner__actions}>
                  <button className={styles.banner__confirm} onClick={() => setShowPicker(true)}>
                    {t('choose')}
                  </button>
                  <button className={styles.banner__change} onClick={dismiss}>
                    {t('skip')}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <div className={styles.picker}>
          <p className={styles.picker__title}>{t('pickerTitle')}</p>
          <div className={styles.picker__grid}>
            {ALL_COUNTRIES.map(c => (
              <button
                key={c.code}
                className={styles.picker__item}
                onClick={() => confirm(c)}
              >
                <span>{c.emoji}</span>
                <span>{countryName(c)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
