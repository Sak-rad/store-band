import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CountryPreference {
  name: string;
  nameRu: string;
  code: string;
  slug: string;
  emoji: string;
}

interface LocationState {
  // Выбранная страна (подтверждённая пользователем)
  country: CountryPreference | null;
  // Определённая по IP (предложение)
  detectedCountry: CountryPreference | null;
  // Баннер закрыт
  bannerDismissed: boolean;
  // Согласие на куки
  cookieConsent: 'accepted' | 'declined' | null;

  setCountry: (c: CountryPreference) => void;
  setDetectedCountry: (c: CountryPreference | null) => void;
  dismissBanner: () => void;
  setCookieConsent: (v: 'accepted' | 'declined') => void;
  reset: () => void;
}

export const useLocationStore = create<LocationState>()(
  persist(
    (set) => ({
      country: null,
      detectedCountry: null,
      bannerDismissed: false,
      cookieConsent: null,

      setCountry: (country) => set({ country, bannerDismissed: true }),
      setDetectedCountry: (detectedCountry) => set({ detectedCountry }),
      dismissBanner: () => set({ bannerDismissed: true }),
      setCookieConsent: (cookieConsent) => set({ cookieConsent }),
      reset: () => set({ country: null, detectedCountry: null, bannerDismissed: false }),
    }),
    {
      name: 'location-prefs',
    },
  ),
);
