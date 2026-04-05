import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // ─── Countries ────────────────────────────────────────────────────────

  await Promise.all([
    prisma.country.upsert({ where: { code: 'AM' }, update: {}, create: { name: 'Armenia', code: 'AM', slug: 'armenia', nameI18n: { en: 'Armenia', ru: 'Армения' } } }),
    prisma.country.upsert({ where: { code: 'RS' }, update: {}, create: { name: 'Serbia',  code: 'RS', slug: 'serbia',  nameI18n: { en: 'Serbia',  ru: 'Сербия'  } } }),
  ]);

  const [thailand, uae, georgia, vietnam] = await Promise.all([
    prisma.country.upsert({ where: { code: 'TH' }, update: {}, create: { name: 'Thailand', code: 'TH', slug: 'thailand', nameI18n: { en: 'Thailand', ru: 'Таиланд' } } }),
    prisma.country.upsert({ where: { code: 'AE' }, update: {}, create: { name: 'UAE',      code: 'AE', slug: 'uae',      nameI18n: { en: 'UAE',      ru: 'ОАЭ'    } } }),
    prisma.country.upsert({ where: { code: 'GE' }, update: {}, create: { name: 'Georgia',  code: 'GE', slug: 'georgia',  nameI18n: { en: 'Georgia',  ru: 'Грузия'  } } }),
    prisma.country.upsert({ where: { code: 'VN' }, update: {}, create: { name: 'Vietnam',  code: 'VN', slug: 'vietnam',  nameI18n: { en: 'Vietnam',  ru: 'Вьетнам' } } }),
  ]);

  // ─── Cities ───────────────────────────────────────────────────────────

  const toSlug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const findOrCreateCity = async (name: string, countryId: number, nameRu: string) => {
    const existing = await prisma.city.findFirst({ where: { name, countryId } });
    return existing ?? await prisma.city.create({ data: { name, countryId, slug: toSlug(name), nameI18n: { en: name, ru: nameRu } } });
  };

  const [phuket, pattaya, dubai] = await Promise.all([
    findOrCreateCity('Bangkok',   thailand.id, 'Бангкок'),
    findOrCreateCity('Phuket',    thailand.id, 'Пхукет'),
    findOrCreateCity('Pattaya',   thailand.id, 'Паттайя'),
    findOrCreateCity('Dubai',     uae.id,      'Дубай'),
    findOrCreateCity('Abu Dhabi', uae.id,      'Абу-Даби'),
    findOrCreateCity('Tbilisi',   georgia.id,  'Тбилиси'),
    findOrCreateCity('Batumi',    georgia.id,  'Батуми'),
  ]).then((cities) => [cities[1], cities[2], cities[3]]); // phuket, pattaya, dubai

  const [hcmc, hanoi, danang, nhaTrang] = await Promise.all([
    findOrCreateCity('Ho Chi Minh City', vietnam.id, 'Хошимин'),
    findOrCreateCity('Hanoi',            vietnam.id, 'Ханой'),
    findOrCreateCity('Da Nang',          vietnam.id, 'Дананг'),
    findOrCreateCity('Nha Trang',        vietnam.id, 'Нячанг'),
  ]);

  // ─── Categories ───────────────────────────────────────────────────────

  // Step 1: parent category (no parentId)
  const realEstate = await prisma.category.upsert({
    where: { slug: 'real-estate' },
    update: { name: 'Real Estate', nameI18n: { en: 'Real Estate', ru: 'Недвижимость' } },
    create: { name: 'Real Estate', slug: 'real-estate', icon: '🏘️', nameI18n: { en: 'Real Estate', ru: 'Недвижимость' } },
  });

  // Step 2: subcategories and top-level service categories
  const upsertCat = (slug: string, name: string, nameRu: string, icon: string, parentId?: number) =>
    (prisma.category.upsert as any)({
      where: { slug },
      update: { parentId: parentId ?? null },
      create: { name, slug, icon, nameI18n: { en: name, ru: nameRu }, parentId },
    });

  const [apartments, villas] = await Promise.all([
    upsertCat('apartments', 'Apartments', 'Квартиры',    '🏢', realEstate.id),
    upsertCat('villas',     'Villas',     'Виллы',       '🏡', realEstate.id),
    upsertCat('excursions', 'Excursions', 'Экскурсии',   '🗺️'),
    upsertCat('transport',  'Transport',  'Транспорт',   '🚗'),
    upsertCat('services',   'Services',   'Услуги',      '🛠️'),
    upsertCat('food',       'Food',       'Питание',     '🍜'),
    upsertCat('healthcare', 'Healthcare', 'Медицина',    '🏥'),
    upsertCat('education',  'Education',  'Образование', '🎓'),
  ]);

  // ─── Seed Provider User ───────────────────────────────────────────────

  const passwordHash = await argon2.hash('Admin1234!');

  const seedUser = await prisma.user.upsert({
    where: { email: 'provider@relocate.dev' },
    update: { passwordHash },
    create: {
      email: 'provider@relocate.dev',
      passwordHash,
      name: 'Relocate Agency',
      role: UserRole.PROVIDER,
      preferredLocale: 'en',
    },
  });

  const provider = await prisma.provider.upsert({
    where: { userId: seedUser.id },
    update: {},
    create: {
      userId: seedUser.id,
      name: 'Relocate Agency',
      nameI18n: { en: 'Relocate Agency', ru: 'Агентство Relocate' },
      bioI18n: { en: 'Professional relocation services across Asia', ru: 'Профессиональные услуги по переезду в Азии' },
      bio: 'Professional relocation services across Asia',
      isVerified: true,
      rating: 4.8,
      reviewCount: 120,
    },
  });

  // ─── Listings ─────────────────────────────────────────────────────────

  await prisma.listing.deleteMany({ where: { providerId: provider.id } });

  // Photo sets (3 photos per listing)
  const PHOTOS = {
    apt_city:   ['1522708323590-d24dbb6b0267','1502672260266-1c1ef2d93688','1555041469-a586c61ea9bc'],
    apt_modern: ['1560347876-aeef00ee58a1','1484154218962-a197022b5858','1493809842364-78817add7ffb'],
    apt_luxury: ['1600596542815-ffad4c1539a9','1600585154526-990dced4db0d','1600210492493-0946911123ea'],
    apt_cozy:   ['1586023492125-27b2c045efd7','1617098850374-9d0f80a89e8d','1524758631624-e2822132akca'],
    apt_beach:  ['1520250497591-112f2f40a3f4','1499793983690-e29da59ef1c2','1506929562872-bb421503ef21'],
    villa_pool: ['1613490493576-12e4b8b77a06','1582268611958-ebfd161ef9cf','1540541338287-41700207dee6'],
    villa_sea:  ['1512917774080-9991f1c4c750','1564013799919-ab600027ffc6','1510798831971-661eb04b3739'],
    villa_garden: ['1537996194471-e657df975ab4','1565538810643-b5bdb714032a','1448630360428-65e5a19e6f92'],
    dubai:      ['1512453979798-5ea266f8880c','1518684079-3c830dcef090','1560438188-1f9b7dc4f94a'],
  };

  const photoUrl = (id: string, w = 1200) =>
    `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;

  const mediaSet = (set: string[]) =>
    set.map((id, i) => ({ url: photoUrl(id), thumbUrl: photoUrl(id, 400), order: i }));

  const listings = [
    // ── Vietnam – Ho Chi Minh City – Apartments ──
    {
      titleI18n: { en: 'Modern studio in District 1', ru: 'Современная студия в Районе 1' },
      descriptionI18n: { en: 'Bright studio apartment with city views in the heart of Saigon. Walking distance to Ben Thanh market, restaurants, and co-working spaces. High-speed Wi-Fi, air conditioning, fully furnished.', ru: 'Светлая студия с видом на город в самом центре Сайгона. Пешком до рынка Бен Тхань, ресторанов и коворкингов. Высокоскоростной Wi-Fi, кондиционер, полная меблировка.' },
      title: 'Modern studio in District 1', description: 'Bright studio apartment with city views in the heart of Saigon.',
      priceMin: 420, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7769, lng: 106.7009, address: '12 Lê Lợi, District 1, Ho Chi Minh City',
      isPublished: true, isFeatured: true, rating: 4.8, reviewCount: 24,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: '2BR apartment in Thao Dien', ru: '2-комнатная квартира в Тхао Дьен' },
      descriptionI18n: { en: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area. Close to international schools, rooftop pool, gym, 24h security.', ru: 'Просторная 2-комнатная квартира в популярном среди экспатов районе Тхао Дьен. Рядом международные школы, бассейн на крыше, спортзал, охрана 24ч.' },
      title: '2BR apartment in Thao Dien', description: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area.',
      priceMin: 750, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.8029, lng: 106.7348, address: 'Thao Dien, District 2, Ho Chi Minh City',
      isPublished: true, isFeatured: false, rating: 4.6, reviewCount: 18,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Luxury 3BR in Vinhomes Central Park', ru: 'Люкс 3-комнатная в Vinhomes Central Park' },
      descriptionI18n: { en: 'Premium 3-bedroom apartment in Vinhomes Central Park tower. Stunning river views, infinity pool, kids club, tennis courts. Fully furnished to hotel standard.', ru: 'Премиальная 3-комнатная квартира в башне Vinhomes Central Park. Потрясающий вид на реку, бассейн с инфинити, детский клуб, теннисные корты.' },
      title: 'Luxury 3BR in Vinhomes Central Park', description: 'Premium 3-bedroom apartment in Vinhomes Central Park tower.',
      priceMin: 1400, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7970, lng: 106.7220, address: 'Vinhomes Central Park, Bình Thạnh, Ho Chi Minh City',
      isPublished: true, isFeatured: true, rating: 4.9, reviewCount: 41,
      photos: PHOTOS.apt_luxury,
    },
    {
      titleI18n: { en: 'Affordable 1BR near Bui Vien Street', ru: 'Доступная 1-комнатная рядом с улицей Буй Вьен' },
      descriptionI18n: { en: 'Cozy 1-bedroom minutes from Bui Vien Walking Street. Great for digital nomads — fast internet, quiet building, central location.', ru: 'Уютная 1-комнатная квартира в нескольких минутах от улицы Буй Вьен. Отлично для цифровых кочевников.' },
      title: 'Affordable 1BR near Bui Vien Street', description: 'Cozy 1-bedroom near Bui Vien Walking Street.',
      priceMin: 320, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7686, lng: 106.6953, address: 'Phạm Ngũ Lão, District 1, Ho Chi Minh City',
      isPublished: true, isFeatured: false, rating: 4.4, reviewCount: 9,
      photos: PHOTOS.apt_cozy,
    },

    // ── Vietnam – Hanoi ──
    {
      titleI18n: { en: 'Stylish 1BR in Hoan Kiem Old Quarter', ru: 'Стильная 1-комнатная в Старом квартале' },
      descriptionI18n: { en: 'Renovated apartment in Hanoi\'s historic Old Quarter, steps from Hoan Kiem Lake, street food, and temples.', ru: 'Отремонтированная квартира в историческом Старом квартале Ханоя. Рядом озеро Хоан Кием, уличная еда и храмы.' },
      title: 'Stylish 1BR in Hoan Kiem Old Quarter', description: 'Renovated apartment in Hanoi\'s historic Old Quarter.',
      priceMin: 480, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hanoi.id, countryId: vietnam.id,
      lat: 21.0278, lng: 105.8342, address: 'Hoan Kiem District, Hanoi',
      isPublished: true, isFeatured: true, rating: 4.7, reviewCount: 33,
      photos: PHOTOS.apt_city,
    },

    // ── Vietnam – Da Nang ──
    {
      titleI18n: { en: 'Beachfront apartment on My Khe Beach', ru: 'Квартира на первой линии пляжа Ми Кхе' },
      descriptionI18n: { en: 'Bright 1-bedroom apartment on Da Nang\'s famous My Khe Beach. Steps from the sea, beach clubs, and fresh seafood.', ru: 'Светлая 1-комнатная квартира на знаменитом пляже Ми Кхе. Несколько шагов до моря и ресторанов морепродуктов.' },
      title: 'Beachfront apartment on My Khe Beach', description: 'Bright 1-bedroom apartment on Da Nang\'s famous My Khe Beach.',
      priceMin: 550, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0544, lng: 108.2472, address: 'My Khe Beach, Son Tra District, Da Nang',
      isPublished: true, isFeatured: true, rating: 4.9, reviewCount: 52,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Private pool villa near Da Nang Beach', ru: 'Вилла с приватным бассейном у пляжа Дананга' },
      descriptionI18n: { en: 'Stunning 3-bedroom villa with private pool, tropical garden, and ocean breeze. Perfect for families or remote teams.', ru: 'Потрясающая 3-комнатная вилла с приватным бассейном и тропическим садом. Идеально для семей.' },
      title: 'Private pool villa near Da Nang Beach', description: 'Stunning 3-bedroom villa with private pool and tropical garden.',
      priceMin: 1200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0200, lng: 108.2490, address: 'Ngu Hanh Son District, Da Nang',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 17,
      photos: PHOTOS.villa_pool,
    },
    {
      titleI18n: { en: 'Sea-view villa in Son Tra Peninsula', ru: 'Вилла с видом на море на полуострове Шон Ча' },
      descriptionI18n: { en: 'Luxury 4-bedroom villa in Son Tra Peninsula. Breathtaking sea views, private terrace, BBQ, housekeeper included.', ru: 'Роскошная 4-комнатная вилла на полуострове Шон Ча. Вид на море, терраса, BBQ, горничная включена.' },
      title: 'Sea-view villa in Son Tra Peninsula', description: 'Luxury 4-bedroom villa with breathtaking sea views.',
      priceMin: 2200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.1108, lng: 108.2768, address: 'Son Tra Peninsula, Da Nang',
      isPublished: true, isFeatured: false, rating: 4.8, reviewCount: 8,
      photos: PHOTOS.villa_sea,
    },
    {
      titleI18n: { en: 'Garden villa near Hoi An Old Town', ru: 'Вилла с садом у Старого города Хойан' },
      descriptionI18n: { en: 'Charming 2-bedroom villa among rice fields, 10 minutes from UNESCO-listed Hoi An Old Town. Bicycle included.', ru: 'Уютная 2-комнатная вилла среди рисовых полей, 10 мин от Хойана. Велосипеды в аренду включены.' },
      title: 'Garden villa near Hoi An Old Town', description: 'Charming 2-bedroom villa near UNESCO-listed Hoi An.',
      priceMin: 900, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 15.8801, lng: 108.3380, address: 'Cam Chau, Hoi An',
      isPublished: true, isFeatured: false, rating: 4.7, reviewCount: 29,
      photos: PHOTOS.villa_garden,
    },

    // ── Vietnam – Nha Trang ──
    {
      titleI18n: { en: 'Ocean-view apartment in Nha Trang', ru: 'Квартира с видом на океан в Нячанге' },
      descriptionI18n: { en: 'Bright 1-bedroom apartment with panoramic sea views on the 15th floor. Nha Trang\'s famous beach just 5 minutes walk. Pool, gym, 24h security.', ru: 'Светлая 1-комнатная квартира с панорамным видом на море на 15 этаже. До знаменитого пляжа Нячанга 5 минут пешком. Бассейн, спортзал.' },
      title: 'Ocean-view apartment in Nha Trang', description: 'Bright 1-bedroom with panoramic sea views, 5 min from the beach.',
      priceMin: 380, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: nhaTrang.id, countryId: vietnam.id,
      lat: 12.2388, lng: 109.1967, address: 'Trần Phú Street, Nha Trang',
      isPublished: true, isFeatured: true, rating: 4.7, reviewCount: 38,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Beachside villa in Nha Trang', ru: 'Вилла у пляжа в Нячанге' },
      descriptionI18n: { en: 'Spacious 3-bedroom villa with tropical garden, steps from the famous Bãi Dài beach. Quiet neighbourhood, private parking, BBQ terrace.', ru: 'Просторная 3-комнатная вилла с тропическим садом у пляжа Бай Дай. Тихий район, парковка, терраса с BBQ.' },
      title: 'Beachside villa in Nha Trang', description: 'Spacious 3-bedroom villa steps from Bãi Dài beach.',
      priceMin: 1100, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: nhaTrang.id, countryId: vietnam.id,
      lat: 12.0060, lng: 109.1420, address: 'Cam Lam District, Nha Trang',
      isPublished: true, isFeatured: false, rating: 4.6, reviewCount: 14,
      photos: PHOTOS.villa_pool,
    },

    // ── Thailand – Phuket ──
    {
      titleI18n: { en: 'Modern condo in Patong Beach', ru: 'Современное кондо у пляжа Патонг' },
      descriptionI18n: { en: 'Stylish 1-bedroom condo in the heart of Patong. Pool, fitness, rooftop bar, 3-minute walk to the beach.', ru: 'Стильное 1-комнатное кондо в центре Патонга. Бассейн, фитнес, бар на крыше, 3 минуты до пляжа.' },
      title: 'Modern condo in Patong Beach', description: 'Stylish 1-bedroom condo, 3-minute walk to Patong Beach.',
      priceMin: 650, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.8960, lng: 98.2973, address: 'Patong, Kathu District, Phuket',
      isPublished: true, isFeatured: true, rating: 4.8, reviewCount: 61,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Luxury pool villa in Kamala', ru: 'Люкс вилла с бассейном в Камала' },
      descriptionI18n: { en: 'Stunning 4-bedroom pool villa in a private estate in Kamala. Sea views, daily housekeeping, chef available on request.', ru: 'Великолепная 4-комнатная вилла с бассейном в частном поместье в Камала. Вид на море, горничная ежедневно, шеф-повар по запросу.' },
      title: 'Luxury pool villa in Kamala', description: 'Stunning 4-bedroom pool villa with sea views in Kamala.',
      priceMin: 3200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.9508, lng: 98.2738, address: 'Kamala, Kathu District, Phuket',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 23,
      photos: PHOTOS.villa_pool,
    },

    // ── Thailand – Pattaya ──
    {
      titleI18n: { en: 'Sea-view studio in Central Pattaya', ru: 'Студия с видом на море в центре Паттайи' },
      descriptionI18n: { en: 'Compact sea-view studio on the 20th floor. Walking distance to Walking Street, beach, restaurants. Pool & gym included.', ru: 'Компактная студия с видом на море на 20 этаже. Пешком до Волкинг Стрит, пляжа и ресторанов. Бассейн и тренажёрный зал.' },
      title: 'Sea-view studio in Central Pattaya', description: 'Compact sea-view studio on the 20th floor, walking distance to the beach.',
      priceMin: 290, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: pattaya.id, countryId: thailand.id,
      lat: 12.9236, lng: 100.8825, address: 'Central Pattaya Road, Pattaya',
      isPublished: true, isFeatured: true, rating: 4.5, reviewCount: 47,
      photos: PHOTOS.apt_modern,
    },

    // ── UAE – Dubai ──
    {
      titleI18n: { en: 'Furnished 1BR in Dubai Marina', ru: '1-комнатная с мебелью в Дубай Марина' },
      descriptionI18n: { en: 'Elegant 1-bedroom apartment in the iconic Dubai Marina. Panoramic marina views, 5-star amenities, metro access. Fully furnished, all bills included.', ru: 'Элегантная 1-комнатная квартира в знаменитой Дубай Марина. Панорамный вид, сервис 5 звёзд, метро рядом. Полная меблировка, счета включены.' },
      title: 'Furnished 1BR in Dubai Marina', description: 'Elegant 1-bedroom with panoramic marina views in iconic Dubai Marina.',
      priceMin: 2100, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.0772, lng: 55.1341, address: 'Dubai Marina, Dubai',
      isPublished: true, isFeatured: true, rating: 4.9, reviewCount: 87,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Luxury penthouse in Downtown Dubai', ru: 'Роскошный пентхаус в Даунтаун Дубай' },
      descriptionI18n: { en: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views. Private rooftop terrace, concierge, valet parking. The ultimate Dubai lifestyle.', ru: 'Захватывающий 3-комнатный пентхаус с видом на Бурдж-Халифу. Частная терраса на крыше, консьерж, парковка с парковщиком. Лучшее из Дубая.' },
      title: 'Luxury penthouse in Downtown Dubai', description: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views.',
      priceMin: 8500, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1972, lng: 55.2744, address: 'Downtown Dubai, Dubai',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 12,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Villa for sale in Palm Jumeirah', ru: 'Вилла на продажу на Пальма Джумейра' },
      descriptionI18n: { en: 'Spectacular 5-bedroom villa for sale on Palm Jumeirah. Private beach access, infinity pool, 360° sea views. Premium finishing throughout.', ru: 'Впечатляющая вилла с 5 спальнями на продажу на Пальма Джумейра. Частный пляж, бассейн инфинити, вид на море 360°. Премиальная отделка.' },
      title: 'Villa for sale in Palm Jumeirah', description: 'Spectacular 5-bedroom villa with private beach access on Palm Jumeirah.',
      priceMin: 2500000, currency: 'USD', listingType: 'buy',
      categoryId: villas.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1124, lng: 55.1390, address: 'Palm Jumeirah, Dubai',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 3,
      photos: PHOTOS.villa_sea,
    },
  ] as const;

  const createdListings: { id: number }[] = [];
  for (const { photos, ...listing } of listings) {
    const created = await prisma.listing.create({
      data: {
        ...listing,
        providerId: provider.id,
        media: { createMany: { data: mediaSet(photos as unknown as string[]) } },
      },
    });
    createdListings.push(created);
  }

  // ─── Seed Reviewer Users ───────────────────────────────────────────────

  const reviewerData = [
    { email: 'anna@relocate.dev',    name: 'Anna K.',     locale: 'ru' },
    { email: 'mikhail@relocate.dev', name: 'Михаил С.',   locale: 'ru' },
    { email: 'james@relocate.dev',   name: 'James T.',    locale: 'en' },
    { email: 'sarah@relocate.dev',   name: 'Sarah M.',    locale: 'en' },
    { email: 'dmitry@relocate.dev',  name: 'Дмитрий В.', locale: 'ru' },
    { email: 'elena@relocate.dev',   name: 'Елена П.',    locale: 'ru' },
    { email: 'oliver@relocate.dev',  name: 'Oliver B.',   locale: 'en' },
  ];

  const reviewers = await Promise.all(
    reviewerData.map(({ email, name, locale }) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { email, name, passwordHash, role: UserRole.USER, preferredLocale: locale },
      })
    )
  );

  // ─── Reviews ──────────────────────────────────────────────────────────
  // Per listing: 2-4 reviews from different users, varied ratings & comments.
  // Delete old seeded reviews first to avoid unique constraint errors.

  await prisma.review.deleteMany({
    where: { userId: { in: reviewers.map(r => r.id) } },
  });

  const reviewPool = [
    // [ userId_index, rating, comment ]
    [0, 5, 'Отличное место! Всё соответствует описанию, хозяин очень отзывчивый. Рекомендую всем.'],
    [1, 4, 'Хорошее расположение, чистая квартира. Немного шумновато по ночам, но в целом отлично.'],
    [2, 5, 'Amazing place! Exactly as described, great location and super clean. Will definitely come back.'],
    [3, 4, 'Very comfortable stay. The host was responsive and helpful. Minor issue with hot water but quickly resolved.'],
    [4, 5, 'Превосходно! Вид потрясающий, инфраструктура на высоте. Однозначно буду снимать снова.'],
    [5, 3, 'Неплохо, но есть что улучшить — шторы пропускают свет и кондиционер немного шумит. В целом жить можно.'],
    [6, 5, 'Fantastic apartment! Great value for money, clean, modern, and the host was incredibly helpful with local tips.'],
    [0, 4, 'Хорошее жильё за свои деньги. Район тихий, рядом все удобства. Хозяин оперативно отвечал на вопросы.'],
    [1, 5, 'Идеально для долгосрочного проживания. Всё что нужно есть, интернет быстрый, соседи приятные.'],
    [2, 4, 'Great spot! Loved the neighborhood and proximity to everything. Would recommend to friends.'],
    [3, 5, 'Superb! The photos do not do it justice — even better in person. Highly recommend.'],
    [4, 4, 'Очень понравилось. Чуть далеко от метро, но зато тихо и уютно. Бассейн просто класс!'],
    [5, 5, 'Лучшее жильё из всех что я снимала за рубежом. Всё продумано до мелочей.'],
    [6, 3, 'Decent place overall. Location is good but the apartment needs some renovation. Not bad for the price though.'],
  ] as [number, number, string][];

  // Assign 3-5 reviews per listing, cycling through pool
  let poolIdx = 0;
  for (const listing of createdListings) {
    const count = 3 + (listing.id % 3); // 3, 4, or 5 reviews per listing
    const usedUsers = new Set<number>();

    for (let i = 0; i < count; i++) {
      const [userIdx, rating, comment] = reviewPool[poolIdx % reviewPool.length];
      const reviewer = reviewers[userIdx];

      if (!usedUsers.has(reviewer.id)) {
        usedUsers.add(reviewer.id);
        await prisma.review.create({
          data: { listingId: listing.id, userId: reviewer.id, rating, comment },
        });
      }
      poolIdx++;
    }

    // Recalculate real rating from seeded reviews
    const agg = await prisma.review.aggregate({
      where: { listingId: listing.id },
      _avg: { rating: true },
      _count: { id: true },
    });
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        rating:      agg._avg.rating ?? 0,
        reviewCount: agg._count.id,
      },
    });
  }

  console.log(`✅ Seed complete — ${listings.length} listings created`);
  console.log(`   Provider login: provider@relocate.dev / Admin1234!`);
  console.log(`   New cities: Nha Trang (VN), Phuket (TH), Pattaya (TH), Dubai (AE)`);
  console.log(`   Categories: real-estate (parent) → apartments, villas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
