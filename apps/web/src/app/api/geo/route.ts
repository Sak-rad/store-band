import { NextRequest, NextResponse } from 'next/server';

// Маппинг кодов стран → данные для нашего сервиса
const COUNTRY_MAP: Record<string, { name: string; nameRu: string; slug: string; emoji: string }> = {
  TH: { name: 'Thailand',  nameRu: 'Таиланд',  slug: 'thailand',  emoji: '🇹🇭' },
  VN: { name: 'Vietnam',   nameRu: 'Вьетнам',  slug: 'vietnam',   emoji: '🇻🇳' },
  ID: { name: 'Indonesia', nameRu: 'Индонезия', slug: 'indonesia', emoji: '🇮🇩' },
  AE: { name: 'UAE',       nameRu: 'ОАЭ',       slug: 'uae',       emoji: '🇦🇪' },
  GE: { name: 'Georgia',   nameRu: 'Грузия',    slug: 'georgia',   emoji: '🇬🇪' },
  AM: { name: 'Armenia',   nameRu: 'Армения',   slug: 'armenia',   emoji: '🇦🇲' },
  RS: { name: 'Serbia',    nameRu: 'Сербия',    slug: 'serbia',    emoji: '🇷🇸' },
  MY: { name: 'Malaysia',  nameRu: 'Малайзия',  slug: 'malaysia',  emoji: '🇲🇾' },
  PT: { name: 'Portugal',  nameRu: 'Португалия', slug: 'portugal', emoji: '🇵🇹' },
  ES: { name: 'Spain',     nameRu: 'Испания',   slug: 'spain',     emoji: '🇪🇸' },
  TR: { name: 'Turkey',    nameRu: 'Турция',    slug: 'turkey',    emoji: '🇹🇷' },
  CY: { name: 'Cyprus',    nameRu: 'Кипр',      slug: 'cyprus',    emoji: '🇨🇾' },
  BG: { name: 'Bulgaria',  nameRu: 'Болгария',  slug: 'bulgaria',  emoji: '🇧🇬' },
  ME: { name: 'Montenegro', nameRu: 'Черногория', slug: 'montenegro', emoji: '🇲🇪' },
  BA: { name: 'Bosnia',    nameRu: 'Босния',    slug: 'bosnia',    emoji: '🇧🇦' },
};

export async function GET(req: NextRequest) {
  // Получаем IP из заголовков (Railway / Vercel / Nginx проксируют)
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '8.8.8.8';

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { 'User-Agent': 'relocate-app/1.0' },
      next: { revalidate: 3600 }, // кешируем на 1 час
    });

    if (!res.ok) throw new Error('ipapi failed');

    const data = await res.json();
    const code: string = data.country_code;
    const country = COUNTRY_MAP[code];

    return NextResponse.json({
      code,
      supported: !!country,
      country: country ? { ...country, code } : null,
    });
  } catch {
    return NextResponse.json({ code: null, supported: false, country: null });
  }
}
