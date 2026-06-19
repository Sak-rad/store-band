import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { deriveListingKind } from '../src/modules/listings/listing-kind.util';

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

  const [apartments, villas, excursions, transport, services, food, healthcare, education] = await Promise.all([
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
    where: { email: 'provider@meriloz.com' },
    update: { passwordHash },
    create: {
      email: 'provider@meriloz.com',
      passwordHash,
      name: 'Meriloz Agency',
      role: UserRole.PROVIDER,
      preferredLocale: 'en',
    },
  });

  const provider = await prisma.provider.upsert({
    where: { userId: seedUser.id },
    update: {},
    create: {
      userId: seedUser.id,
      name: 'Meriloz Agency',
      nameI18n: { en: 'Meriloz Agency', ru: 'Агентство Relocate' },
      bioI18n: { en: 'Professional travel & relocation services across Asia', ru: 'Профессиональные услуги по переезду в Азии' },
      bio: 'Professional travel & relocation services across Asia',
      isVerified: true,
    },
  });

  // ─── Listings ─────────────────────────────────────────────────────────

  await prisma.listing.deleteMany({ where: { providerId: provider.id } });

  // Photo sets (3 photos per listing)
  const PHOTOS = {
    apt_city:   ['1522708323590-d24dbb6b0267','1502672260266-1c1ef2d93688','1555041469-a586c61ea9bc'],
    apt_modern: ['1560347876-aeef00ee58a1','1484154218962-a197022b5858','1493809842364-78817add7ffb'],
    apt_luxury: ['1600596542815-ffad4c1539a9','1600585154526-990dced4db0d','1600210492493-0946911123ea'],
    apt_cozy:   ['1586023492125-27b2c045efd7','1493809842364-78817add7ffb','1484154218962-a197022b5858'],
    apt_beach:  ['1520250497591-112f2f40a3f4','1499793983690-e29da59ef1c2','1506929562872-bb421503ef21'],
    villa_pool: ['1512917774080-9991f1c4c750','1582268611958-ebfd161ef9cf','1540541338287-41700207dee6'],
    villa_sea:  ['1512917774080-9991f1c4c750','1564013799919-ab600027ffc6','1510798831971-661eb04b3739'],
    villa_garden: ['1537996194471-e657df975ab4','1565538810643-b5bdb714032a','1510798831971-661eb04b3739'],
    dubai:      ['1512453979798-5ea266f8880c','1518684079-3c830dcef090','1600596542815-ffad4c1539a9'],
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
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: '2BR apartment in Thao Dien', ru: '2-комнатная квартира в Тхао Дьен' },
      descriptionI18n: { en: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area. Close to international schools, rooftop pool, gym, 24h security.', ru: 'Просторная 2-комнатная квартира в популярном среди экспатов районе Тхао Дьен. Рядом международные школы, бассейн на крыше, спортзал, охрана 24ч.' },
      title: '2BR apartment in Thao Dien', description: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area.',
      priceMin: 750, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.8029, lng: 106.7348, address: 'Thao Dien, District 2, Ho Chi Minh City',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Luxury 3BR in Vinhomes Central Park', ru: 'Люкс 3-комнатная в Vinhomes Central Park' },
      descriptionI18n: { en: 'Premium 3-bedroom apartment in Vinhomes Central Park tower. Stunning river views, infinity pool, kids club, tennis courts. Fully furnished to hotel standard.', ru: 'Премиальная 3-комнатная квартира в башне Vinhomes Central Park. Потрясающий вид на реку, бассейн с инфинити, детский клуб, теннисные корты.' },
      title: 'Luxury 3BR in Vinhomes Central Park', description: 'Premium 3-bedroom apartment in Vinhomes Central Park tower.',
      priceMin: 1400, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7970, lng: 106.7220, address: 'Vinhomes Central Park, Bình Thạnh, Ho Chi Minh City',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_luxury,
    },
    {
      titleI18n: { en: 'Affordable 1BR near Bui Vien Street', ru: 'Доступная 1-комнатная рядом с улицей Буй Вьен' },
      descriptionI18n: { en: 'Cozy 1-bedroom minutes from Bui Vien Walking Street. Great for digital nomads — fast internet, quiet building, central location.', ru: 'Уютная 1-комнатная квартира в нескольких минутах от улицы Буй Вьен. Отлично для цифровых кочевников.' },
      title: 'Affordable 1BR near Bui Vien Street', description: 'Cozy 1-bedroom near Bui Vien Walking Street.',
      priceMin: 320, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7686, lng: 106.6953, address: 'Phạm Ngũ Lão, District 1, Ho Chi Minh City',
      isPublished: true, isFeatured: false,
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
      isPublished: true, isFeatured: true,
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
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Private pool villa near Da Nang Beach', ru: 'Вилла с приватным бассейном у пляжа Дананга' },
      descriptionI18n: { en: 'Stunning 3-bedroom villa with private pool, tropical garden, and ocean breeze. Perfect for families or remote teams.', ru: 'Потрясающая 3-комнатная вилла с приватным бассейном и тропическим садом. Идеально для семей.' },
      title: 'Private pool villa near Da Nang Beach', description: 'Stunning 3-bedroom villa with private pool and tropical garden.',
      priceMin: 1200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0200, lng: 108.2490, address: 'Ngu Hanh Son District, Da Nang',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_pool,
    },
    {
      titleI18n: { en: 'Sea-view villa in Son Tra Peninsula', ru: 'Вилла с видом на море на полуострове Шон Ча' },
      descriptionI18n: { en: 'Luxury 4-bedroom villa in Son Tra Peninsula. Breathtaking sea views, private terrace, BBQ, housekeeper included.', ru: 'Роскошная 4-комнатная вилла на полуострове Шон Ча. Вид на море, терраса, BBQ, горничная включена.' },
      title: 'Sea-view villa in Son Tra Peninsula', description: 'Luxury 4-bedroom villa with breathtaking sea views.',
      priceMin: 2200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.1108, lng: 108.2768, address: 'Son Tra Peninsula, Da Nang',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.villa_sea,
    },
    {
      titleI18n: { en: 'Garden villa near Hoi An Old Town', ru: 'Вилла с садом у Старого города Хойан' },
      descriptionI18n: { en: 'Charming 2-bedroom villa among rice fields, 10 minutes from UNESCO-listed Hoi An Old Town. Bicycle included.', ru: 'Уютная 2-комнатная вилла среди рисовых полей, 10 мин от Хойана. Велосипеды в аренду включены.' },
      title: 'Garden villa near Hoi An Old Town', description: 'Charming 2-bedroom villa near UNESCO-listed Hoi An.',
      priceMin: 900, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 15.8801, lng: 108.3380, address: 'Cam Chau, Hoi An',
      isPublished: true, isFeatured: false,
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
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Beachside villa in Nha Trang', ru: 'Вилла у пляжа в Нячанге' },
      descriptionI18n: { en: 'Spacious 3-bedroom villa with tropical garden, steps from the famous Bãi Dài beach. Quiet neighbourhood, private parking, BBQ terrace.', ru: 'Просторная 3-комнатная вилла с тропическим садом у пляжа Бай Дай. Тихий район, парковка, терраса с BBQ.' },
      title: 'Beachside villa in Nha Trang', description: 'Spacious 3-bedroom villa steps from Bãi Dài beach.',
      priceMin: 1100, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: nhaTrang.id, countryId: vietnam.id,
      lat: 12.0060, lng: 109.1420, address: 'Cam Lam District, Nha Trang',
      isPublished: true, isFeatured: false,
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
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Luxury pool villa in Kamala', ru: 'Люкс вилла с бассейном в Камала' },
      descriptionI18n: { en: 'Stunning 4-bedroom pool villa in a private estate in Kamala. Sea views, daily housekeeping, chef available on request.', ru: 'Великолепная 4-комнатная вилла с бассейном в частном поместье в Камала. Вид на море, горничная ежедневно, шеф-повар по запросу.' },
      title: 'Luxury pool villa in Kamala', description: 'Stunning 4-bedroom pool villa with sea views in Kamala.',
      priceMin: 3200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.9508, lng: 98.2738, address: 'Kamala, Kathu District, Phuket',
      isPublished: true, isFeatured: true,
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
      isPublished: true, isFeatured: true,
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
      isPublished: true, isFeatured: true,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Luxury penthouse in Downtown Dubai', ru: 'Роскошный пентхаус в Даунтаун Дубай' },
      descriptionI18n: { en: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views. Private rooftop terrace, concierge, valet parking. The ultimate Dubai lifestyle.', ru: 'Захватывающий 3-комнатный пентхаус с видом на Бурдж-Халифу. Частная терраса на крыше, консьерж, парковка с парковщиком. Лучшее из Дубая.' },
      title: 'Luxury penthouse in Downtown Dubai', description: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views.',
      priceMin: 8500, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1972, lng: 55.2744, address: 'Downtown Dubai, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Villa for sale in Palm Jumeirah', ru: 'Вилла на продажу на Пальма Джумейра' },
      descriptionI18n: { en: 'Spectacular 5-bedroom villa for sale on Palm Jumeirah. Private beach access, infinity pool, 360° sea views. Premium finishing throughout.', ru: 'Впечатляющая вилла с 5 спальнями на продажу на Пальма Джумейра. Частный пляж, бассейн инфинити, вид на море 360°. Премиальная отделка.' },
      title: 'Villa for sale in Palm Jumeirah', description: 'Spectacular 5-bedroom villa with private beach access on Palm Jumeirah.',
      priceMin: 2500000, currency: 'USD', listingType: 'buy',
      categoryId: villas.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1124, lng: 55.1390, address: 'Palm Jumeirah, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_sea,
    },

    // ── EXPERIENCES — Excursions (price per person) ──────────────────────
    {
      titleI18n: { en: 'Phang Nga Bay & James Bond Island boat tour', ru: 'Тур на лодке в залив Пханг Нга и остров Джеймса Бонда' },
      descriptionI18n: { en: 'Full-day longtail boat tour through the limestone karsts of Phang Nga Bay. Sea canoeing through hidden lagoons, lunch included, hotel pickup.', ru: 'Целодневный тур на традиционной лодке среди скал залива Пханг Нга. Каякинг по скрытым лагунам, обед включён, трансфер из отеля.' },
      title: 'Phang Nga Bay & James Bond Island boat tour', description: 'Full-day longtail boat tour through the limestone karsts of Phang Nga Bay.',
      priceMin: 65, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: phuket.id, countryId: thailand.id,
      lat: 8.2742, lng: 98.5008, address: 'Phang Nga Bay, departs Phuket',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_sea,
    },
    {
      titleI18n: { en: 'Phi Phi Islands speedboat day trip', ru: 'Однодневный тур на острова Пхи-Пхи на катере' },
      descriptionI18n: { en: 'Speedboat tour to the iconic Phi Phi Islands and Maya Bay. Snorkeling at Pileh Lagoon, Thai buffet lunch, national park guide.', ru: 'Тур на скоростном катере к знаменитым островам Пхи-Пхи и бухте Майя. Снорклинг в лагуне Пиле, тайский обед-буфет, гид.' },
      title: 'Phi Phi Islands speedboat day trip', description: 'Speedboat tour to the iconic Phi Phi Islands and Maya Bay.',
      priceMin: 80, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.7407, lng: 98.7784, address: 'Phi Phi Islands, departs Phuket',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_beach,
    },
    {
      titleI18n: { en: 'Coral Island snorkeling & beach tour', ru: 'Снорклинг и пляжный тур на Коралловый остров' },
      descriptionI18n: { en: 'Half-day trip to Koh Larn (Coral Island) from Pattaya. Crystal-clear water, snorkeling gear, beach time, optional parasailing.', ru: 'Полудневная поездка на остров Ко Лан из Паттайи. Прозрачная вода, снаряжение для снорклинга, отдых на пляже, парасейлинг по желанию.' },
      title: 'Coral Island snorkeling & beach tour', description: 'Half-day trip to Koh Larn (Coral Island) from Pattaya.',
      priceMin: 45, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: pattaya.id, countryId: thailand.id,
      lat: 12.9180, lng: 100.7820, address: 'Koh Larn, departs Pattaya',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_pool,
    },
    {
      titleI18n: { en: 'Dubai desert safari with BBQ dinner', ru: 'Сафари по пустыне Дубая с ужином-барбекю' },
      descriptionI18n: { en: 'Evening desert safari with dune bashing, camel ride, sandboarding and live shows. BBQ dinner under the stars, hotel transfers included.', ru: 'Вечернее сафари по пустыне: катание по дюнам, верблюды, сэндбординг и шоу. Ужин-барбекю под звёздами, трансфер включён.' },
      title: 'Dubai desert safari with BBQ dinner', description: 'Evening desert safari with dune bashing, camel ride and BBQ dinner.',
      priceMin: 70, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: dubai.id, countryId: uae.id,
      lat: 24.9180, lng: 55.4090, address: 'Al Marmoom Desert, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Burj Khalifa & Dubai city sightseeing tour', ru: 'Обзорный тур по Дубаю с Бурдж-Халифой' },
      descriptionI18n: { en: 'Guided city tour covering Burj Khalifa (124th floor), Dubai Mall, Palm Jumeirah and the old souks. Air-conditioned van, English/Russian guide.', ru: 'Обзорный тур с гидом: Бурдж-Халифа (124 этаж), Dubai Mall, Пальма Джумейра и старые рынки. Автобус с кондиционером, гид EN/RU.' },
      title: 'Burj Khalifa & Dubai city sightseeing tour', description: 'Guided city tour covering Burj Khalifa, Dubai Mall and Palm Jumeirah.',
      priceMin: 55, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1972, lng: 55.2744, address: 'Downtown Dubai, Dubai',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Mekong Delta full-day tour', ru: 'Целодневный тур по дельте Меконга' },
      descriptionI18n: { en: 'Full-day Mekong Delta tour from Saigon. Sampan boat ride, fruit orchards, coconut candy workshop, traditional lunch. English-speaking guide.', ru: 'Целодневный тур по дельте Меконга из Сайгона. Прогулка на сампане, фруктовые сады, мастерская кокосовых конфет, обед. Гид со знанием английского.' },
      title: 'Mekong Delta full-day tour', description: 'Full-day Mekong Delta tour from Saigon with sampan boat ride and lunch.',
      priceMin: 40, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.3600, lng: 106.3600, address: 'My Tho, Mekong Delta — departs Ho Chi Minh City',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: 'Cu Chi Tunnels half-day tour', ru: 'Полудневный тур по тоннелям Кучи' },
      descriptionI18n: { en: 'Explore the legendary Cu Chi Tunnels network. Crawl through original tunnels, learn the wartime history, hotel pickup in District 1.', ru: 'Исследуйте легендарную сеть тоннелей Кучи. Спуск в настоящие тоннели, рассказ об истории войны, трансфер из района 1.' },
      title: 'Cu Chi Tunnels half-day tour', description: 'Explore the legendary Cu Chi Tunnels with a local guide.',
      priceMin: 30, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 11.1430, lng: 106.4640, address: 'Cu Chi, departs Ho Chi Minh City',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Halong Bay luxury cruise day trip', ru: 'Дневной круиз по бухте Халонг' },
      descriptionI18n: { en: 'Day cruise through the UNESCO World Heritage Halong Bay. Kayaking, cave visit, seafood lunch on board, round-trip transfer from Hanoi.', ru: 'Дневной круиз по бухте Халонг (наследие ЮНЕСКО). Каякинг, посещение пещеры, обед из морепродуктов на борту, трансфер из Ханоя.' },
      title: 'Halong Bay luxury cruise day trip', description: 'Day cruise through UNESCO World Heritage Halong Bay with kayaking and lunch.',
      priceMin: 95, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: hanoi.id, countryId: vietnam.id,
      lat: 20.9101, lng: 107.1839, address: 'Halong Bay, departs Hanoi',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_sea,
    },
    {
      titleI18n: { en: 'Ba Na Hills & Golden Bridge tour', ru: 'Тур на Ба На Хиллс и Золотой мост' },
      descriptionI18n: { en: 'Full-day tour to Ba Na Hills via the record-breaking cable car. The famous Golden Bridge, French Village, Fantasy Park, buffet lunch.', ru: 'Целодневный тур на Ба На Хиллс по рекордной канатной дороге. Знаменитый Золотой мост, Французская деревня, парк развлечений, обед-буфет.' },
      title: 'Ba Na Hills & Golden Bridge tour', description: 'Full-day tour to Ba Na Hills and the famous Golden Bridge.',
      priceMin: 60, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: danang.id, countryId: vietnam.id,
      lat: 15.9977, lng: 107.9961, address: 'Ba Na Hills, Da Nang',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_garden,
    },
    {
      titleI18n: { en: 'Nha Trang island-hopping boat tour', ru: 'Тур по островам Нячанга на лодке' },
      descriptionI18n: { en: 'Four-island boat tour off Nha Trang. Snorkeling over coral reefs, floating bar, fresh seafood lunch, beach stop at Bãi Tranh.', ru: 'Тур на лодке по четырём островам Нячанга. Снорклинг над коралловыми рифами, плавучий бар, обед из морепродуктов, остановка на пляже Бай Чань.' },
      title: 'Nha Trang island-hopping boat tour', description: 'Four-island boat tour with snorkeling and fresh seafood lunch.',
      priceMin: 35, currency: 'USD', listingType: 'service',
      categoryId: excursions.id, cityId: nhaTrang.id, countryId: vietnam.id,
      lat: 12.1900, lng: 109.2400, address: 'Nha Trang Bay, Nha Trang',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_beach,
    },

    // ── SERVICES — Transport / Relocation / Food / Health / Education ────
    {
      titleI18n: { en: 'Airport transfer & private driver', ru: 'Трансфер из аэропорта и личный водитель' },
      descriptionI18n: { en: 'Reliable airport pickup and private driver service across Phuket. English-speaking driver, child seats on request, flight tracking.', ru: 'Надёжный трансфер из аэропорта и услуги личного водителя по Пхукету. Водитель со знанием английского, детские кресла по запросу, отслеживание рейса.' },
      title: 'Airport transfer & private driver', description: 'Reliable airport pickup and private driver service across Phuket.',
      priceMin: 35, currency: 'USD', listingType: 'service',
      categoryId: transport.id, cityId: phuket.id, countryId: thailand.id,
      lat: 8.1132, lng: 98.3170, address: 'Phuket International Airport, Phuket',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Monthly scooter rental with delivery', ru: 'Аренда скутера на месяц с доставкой' },
      descriptionI18n: { en: 'Well-maintained automatic scooters for monthly rental in Da Nang. Free delivery to your door, helmets, insurance, 24/7 roadside support.', ru: 'Исправные автоматические скутеры в аренду на месяц в Дананге. Бесплатная доставка к двери, шлемы, страховка, поддержка 24/7.' },
      title: 'Monthly scooter rental with delivery', description: 'Well-maintained automatic scooters for monthly rental in Da Nang.',
      priceMin: 80, currency: 'USD', listingType: 'service',
      categoryId: transport.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0544, lng: 108.2022, address: 'Hai Chau District, Da Nang',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_cozy,
    },
    {
      titleI18n: { en: 'Private car with driver — full day', ru: 'Автомобиль с водителем на весь день' },
      descriptionI18n: { en: 'Full-day private car hire with professional chauffeur in Dubai. Luxury sedan or SUV, fuel and tolls included, flexible itinerary.', ru: 'Аренда автомобиля с профессиональным водителем на весь день в Дубае. Седан или внедорожник премиум-класса, топливо и платные дороги включены.' },
      title: 'Private car with driver — full day', description: 'Full-day private car hire with professional chauffeur in Dubai.',
      priceMin: 120, currency: 'USD', listingType: 'service',
      categoryId: transport.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.2048, lng: 55.2708, address: 'Business Bay, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Visa run & immigration assistance', ru: 'Визаран и помощь с иммиграцией' },
      descriptionI18n: { en: 'End-to-end visa run and immigration support in Thailand. Document prep, border-run logistics, 90-day reporting, extensions. Expats welcome.', ru: 'Полное сопровождение визарана и иммиграционных вопросов в Таиланде. Подготовка документов, логистика, 90-дневная отчётность, продление виз.' },
      title: 'Visa run & immigration assistance', description: 'End-to-end visa run and immigration support in Thailand.',
      priceMin: 150, currency: 'USD', listingType: 'service',
      categoryId: services.id, cityId: pattaya.id, countryId: thailand.id,
      lat: 12.9236, lng: 100.8825, address: 'Central Pattaya, Pattaya',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: 'Relocation & paperwork concierge', ru: 'Консьерж по переезду и документам' },
      descriptionI18n: { en: 'Personal relocation concierge in Dubai: residence visa, Emirates ID, bank account opening, utilities setup, school search. One point of contact.', ru: 'Персональный консьерж по переезду в Дубае: резидентская виза, Emirates ID, открытие счёта, подключение коммуналки, поиск школы. Один контакт на всё.' },
      title: 'Relocation & paperwork concierge', description: 'Personal relocation concierge handling visa, Emirates ID and bank setup in Dubai.',
      priceMin: 300, currency: 'USD', listingType: 'service',
      categoryId: services.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.2048, lng: 55.2708, address: 'DIFC, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.dubai,
    },
    {
      titleI18n: { en: 'Apartment deep cleaning — monthly plan', ru: 'Генеральная уборка квартиры — помесячно' },
      descriptionI18n: { en: 'Monthly apartment cleaning subscription in Ho Chi Minh City. Vetted staff, eco-friendly products, laundry and ironing add-ons available.', ru: 'Помесячная подписка на уборку квартиры в Хошимине. Проверенный персонал, эко-средства, стирка и глажка как доп. опции.' },
      title: 'Apartment deep cleaning — monthly plan', description: 'Monthly apartment cleaning subscription in Ho Chi Minh City.',
      priceMin: 90, currency: 'USD', listingType: 'service',
      categoryId: services.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7769, lng: 106.7009, address: 'District 1, Ho Chi Minh City',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Healthy meal delivery — weekly plan', ru: 'Доставка здоровой еды — на неделю' },
      descriptionI18n: { en: 'Chef-prepared healthy meal delivery in Da Nang. Balanced menus, vegetarian and keto options, delivered fresh daily to your apartment.', ru: 'Доставка здоровой еды от шефа в Дананге. Сбалансированное меню, вегетарианские и кето-опции, свежая доставка каждый день.' },
      title: 'Healthy meal delivery — weekly plan', description: 'Chef-prepared healthy meal delivery in Da Nang with vegetarian and keto options.',
      priceMin: 120, currency: 'USD', listingType: 'service',
      categoryId: food.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0544, lng: 108.2472, address: 'My An Ward, Da Nang',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_cozy,
    },
    {
      titleI18n: { en: 'Private chef at home — per event', ru: 'Частный шеф-повар на дом — за мероприятие' },
      descriptionI18n: { en: 'Book a private chef for dinners and events in Phuket. Custom Thai or international menu, grocery shopping, cooking and cleanup included.', ru: 'Закажите частного шефа для ужинов и мероприятий на Пхукете. Меню на выбор — тайское или интернациональное, закупка продуктов, готовка и уборка включены.' },
      title: 'Private chef at home — per event', description: 'Book a private chef for dinners and events in Phuket.',
      priceMin: 200, currency: 'USD', listingType: 'service',
      categoryId: food.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.8804, lng: 98.3923, address: 'Phuket Town, Phuket',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.villa_garden,
    },
    {
      titleI18n: { en: 'Expat health insurance consultation', ru: 'Консультация по медстраховке для экспатов' },
      descriptionI18n: { en: 'Independent health insurance advisory for expats in the UAE. Compare international plans, claims support, renewals. No obligation first call.', ru: 'Независимая консультация по медицинскому страхованию для экспатов в ОАЭ. Сравнение международных планов, поддержка по выплатам, продление. Первый звонок без обязательств.' },
      title: 'Expat health insurance consultation', description: 'Independent health insurance advisory for expats in the UAE.',
      priceMin: 50, currency: 'USD', listingType: 'service',
      categoryId: healthcare.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.2048, lng: 55.2708, address: 'Healthcare City, Dubai',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: 'Clinic & telemedicine appointment booking', ru: 'Запись к врачу и телемедицина' },
      descriptionI18n: { en: 'Concierge medical booking in Ho Chi Minh City. International clinics, English/Russian-speaking doctors, telemedicine, appointment escort.', ru: 'Консьерж-запись к врачу в Хошимине. Международные клиники, врачи со знанием английского/русского, телемедицина, сопровождение на приём.' },
      title: 'Clinic & telemedicine appointment booking', description: 'Concierge medical booking with international clinics in Ho Chi Minh City.',
      priceMin: 40, currency: 'USD', listingType: 'service',
      categoryId: healthcare.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7829, lng: 106.6957, address: 'District 3, Ho Chi Minh City',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.apt_modern,
    },
    {
      titleI18n: { en: 'Vietnamese language tutoring — monthly', ru: 'Репетитор вьетнамского языка — помесячно' },
      descriptionI18n: { en: 'One-on-one Vietnamese lessons for expats in Hanoi. Flexible schedule, online or in person, beginner to conversational, 8 sessions/month.', ru: 'Индивидуальные уроки вьетнамского для экспатов в Ханое. Гибкий график, онлайн или очно, от новичка до разговорного, 8 занятий в месяц.' },
      title: 'Vietnamese language tutoring — monthly', description: 'One-on-one Vietnamese lessons for expats in Hanoi, 8 sessions per month.',
      priceMin: 180, currency: 'USD', listingType: 'service',
      categoryId: education.id, cityId: hanoi.id, countryId: vietnam.id,
      lat: 21.0278, lng: 105.8342, address: 'Ba Dinh District, Hanoi',
      isPublished: true, isFeatured: true,
      photos: PHOTOS.apt_city,
    },
    {
      titleI18n: { en: 'International school placement advisory', ru: 'Консультация по подбору международной школы' },
      descriptionI18n: { en: 'Expert advisory for placing your children in Dubai international schools. Shortlisting, applications, assessments prep, enrolment support.', ru: 'Экспертная помощь в устройстве детей в международные школы Дубая. Подбор, заявки, подготовка к тестам, сопровождение зачисления.' },
      title: 'International school placement advisory', description: 'Expert advisory for placing your children in Dubai international schools.',
      priceMin: 250, currency: 'USD', listingType: 'service',
      categoryId: education.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1110, lng: 55.1880, address: 'Jumeirah, Dubai',
      isPublished: true, isFeatured: false,
      photos: PHOTOS.dubai,
    },
  ] as const;

  const slugByCategoryId: Record<number, string> = {
    [apartments.id]: apartments.slug,
    [villas.id]: villas.slug,
    [excursions.id]: excursions.slug,
    [transport.id]: transport.slug,
    [services.id]: services.slug,
    [food.id]: food.slug,
    [healthcare.id]: healthcare.slug,
    [education.id]: education.slug,
  };

  const createdListings: { id: number }[] = [];
  for (const { photos, ...listing } of listings) {
    const created = await prisma.listing.create({
      data: {
        ...listing,
        kind: deriveListingKind(slugByCategoryId[listing.categoryId], listing.listingType),
        providerId: provider.id,
        media: { createMany: { data: mediaSet(photos as unknown as string[]) } },
      },
    });
    createdListings.push(created);
  }

  // ─── Seed Reviewer Users ───────────────────────────────────────────────

  const reviewerData = [
    { email: 'anna@meriloz.com',    name: 'Anna K.',     locale: 'ru' },
    { email: 'mikhail@meriloz.com', name: 'Михаил С.',   locale: 'ru' },
    { email: 'james@meriloz.com',   name: 'James T.',    locale: 'en' },
    { email: 'sarah@meriloz.com',   name: 'Sarah M.',    locale: 'en' },
    { email: 'dmitry@meriloz.com',  name: 'Дмитрий В.', locale: 'ru' },
    { email: 'elena@meriloz.com',   name: 'Елена П.',    locale: 'ru' },
    { email: 'oliver@meriloz.com',  name: 'Oliver B.',   locale: 'en' },
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
  console.log(`   Provider login: provider@meriloz.com / Admin1234!`);
  console.log(`   New cities: Nha Trang (VN), Phuket (TH), Pattaya (TH), Dubai (AE)`);
  console.log(`   Verticals: real-estate (apartments/villas), experiences (excursions), services (transport/services/food/healthcare/education)`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
