import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // ─── Countries ────────────────────────────────────────────────────────

  await Promise.all([
    prisma.country.upsert({ where: { code: 'AM' }, update: {}, create: { name: 'Armenia', code: 'AM', nameI18n: { en: 'Armenia', ru: 'Армения' } } }),
    prisma.country.upsert({ where: { code: 'RS' }, update: {}, create: { name: 'Serbia',  code: 'RS', nameI18n: { en: 'Serbia',  ru: 'Сербия'  } } }),
  ]);

  const [thailand, uae, georgia, vietnam] = await Promise.all([
    prisma.country.upsert({ where: { code: 'TH' }, update: {}, create: { name: 'Thailand', code: 'TH', nameI18n: { en: 'Thailand', ru: 'Таиланд' } } }),
    prisma.country.upsert({ where: { code: 'AE' }, update: {}, create: { name: 'UAE',      code: 'AE', nameI18n: { en: 'UAE',      ru: 'ОАЭ'    } } }),
    prisma.country.upsert({ where: { code: 'GE' }, update: {}, create: { name: 'Georgia',  code: 'GE', nameI18n: { en: 'Georgia',  ru: 'Грузия'  } } }),
    prisma.country.upsert({ where: { code: 'VN' }, update: {}, create: { name: 'Vietnam',  code: 'VN', nameI18n: { en: 'Vietnam',  ru: 'Вьетнам' } } }),
  ]);

  // ─── Cities ───────────────────────────────────────────────────────────

  const findOrCreateCity = async (name: string, countryId: string, nameRu: string) => {
    const existing = await prisma.city.findFirst({ where: { name, countryId } });
    return existing ?? await prisma.city.create({ data: { name, countryId, nameI18n: { en: name, ru: nameRu } } });
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
  const upsertCat = (slug: string, name: string, nameRu: string, icon: string, parentId?: string) =>
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
    update: {},
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
    },
    {
      titleI18n: { en: '2BR apartment in Thao Dien', ru: '2-комнатная квартира в Тхао Дьен' },
      descriptionI18n: { en: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area. Close to international schools, rooftop pool, gym, 24h security.', ru: 'Просторная 2-комнатная квартира в популярном среди экспатов районе Тхао Дьен. Рядом международные школы, бассейн на крыше, спортзал, охрана 24ч.' },
      title: '2BR apartment in Thao Dien', description: 'Spacious 2-bedroom apartment in the expat-favorite Thao Dien area.',
      priceMin: 750, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.8029, lng: 106.7348, address: 'Thao Dien, District 2, Ho Chi Minh City',
      isPublished: true, isFeatured: false, rating: 4.6, reviewCount: 18,
    },
    {
      titleI18n: { en: 'Luxury 3BR in Vinhomes Central Park', ru: 'Люкс 3-комнатная в Vinhomes Central Park' },
      descriptionI18n: { en: 'Premium 3-bedroom apartment in Vinhomes Central Park tower. Stunning river views, infinity pool, kids club, tennis courts. Fully furnished to hotel standard.', ru: 'Премиальная 3-комнатная квартира в башне Vinhomes Central Park. Потрясающий вид на реку, бассейн с инфинити, детский клуб, теннисные корты.' },
      title: 'Luxury 3BR in Vinhomes Central Park', description: 'Premium 3-bedroom apartment in Vinhomes Central Park tower.',
      priceMin: 1400, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7970, lng: 106.7220, address: 'Vinhomes Central Park, Bình Thạnh, Ho Chi Minh City',
      isPublished: true, isFeatured: true, rating: 4.9, reviewCount: 41,
    },
    {
      titleI18n: { en: 'Affordable 1BR near Bui Vien Street', ru: 'Доступная 1-комнатная рядом с улицей Буй Вьен' },
      descriptionI18n: { en: 'Cozy 1-bedroom minutes from Bui Vien Walking Street. Great for digital nomads — fast internet, quiet building, central location.', ru: 'Уютная 1-комнатная квартира в нескольких минутах от улицы Буй Вьен. Отлично для цифровых кочевников.' },
      title: 'Affordable 1BR near Bui Vien Street', description: 'Cozy 1-bedroom near Bui Vien Walking Street.',
      priceMin: 320, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: hcmc.id, countryId: vietnam.id,
      lat: 10.7686, lng: 106.6953, address: 'Phạm Ngũ Lão, District 1, Ho Chi Minh City',
      isPublished: true, isFeatured: false, rating: 4.4, reviewCount: 9,
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
    },
    {
      titleI18n: { en: 'Private pool villa near Da Nang Beach', ru: 'Вилла с приватным бассейном у пляжа Дананга' },
      descriptionI18n: { en: 'Stunning 3-bedroom villa with private pool, tropical garden, and ocean breeze. Perfect for families or remote teams.', ru: 'Потрясающая 3-комнатная вилла с приватным бассейном и тропическим садом. Идеально для семей.' },
      title: 'Private pool villa near Da Nang Beach', description: 'Stunning 3-bedroom villa with private pool and tropical garden.',
      priceMin: 1200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.0200, lng: 108.2490, address: 'Ngu Hanh Son District, Da Nang',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 17,
    },
    {
      titleI18n: { en: 'Sea-view villa in Son Tra Peninsula', ru: 'Вилла с видом на море на полуострове Шон Ча' },
      descriptionI18n: { en: 'Luxury 4-bedroom villa in Son Tra Peninsula. Breathtaking sea views, private terrace, BBQ, housekeeper included.', ru: 'Роскошная 4-комнатная вилла на полуострове Шон Ча. Вид на море, терраса, BBQ, горничная включена.' },
      title: 'Sea-view villa in Son Tra Peninsula', description: 'Luxury 4-bedroom villa with breathtaking sea views.',
      priceMin: 2200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 16.1108, lng: 108.2768, address: 'Son Tra Peninsula, Da Nang',
      isPublished: true, isFeatured: false, rating: 4.8, reviewCount: 8,
    },
    {
      titleI18n: { en: 'Garden villa near Hoi An Old Town', ru: 'Вилла с садом у Старого города Хойан' },
      descriptionI18n: { en: 'Charming 2-bedroom villa among rice fields, 10 minutes from UNESCO-listed Hoi An Old Town. Bicycle included.', ru: 'Уютная 2-комнатная вилла среди рисовых полей, 10 мин от Хойана. Велосипеды в аренду включены.' },
      title: 'Garden villa near Hoi An Old Town', description: 'Charming 2-bedroom villa near UNESCO-listed Hoi An.',
      priceMin: 900, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: danang.id, countryId: vietnam.id,
      lat: 15.8801, lng: 108.3380, address: 'Cam Chau, Hoi An',
      isPublished: true, isFeatured: false, rating: 4.7, reviewCount: 29,
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
    },
    {
      titleI18n: { en: 'Beachside villa in Nha Trang', ru: 'Вилла у пляжа в Нячанге' },
      descriptionI18n: { en: 'Spacious 3-bedroom villa with tropical garden, steps from the famous Bãi Dài beach. Quiet neighbourhood, private parking, BBQ terrace.', ru: 'Просторная 3-комнатная вилла с тропическим садом у пляжа Бай Дай. Тихий район, парковка, терраса с BBQ.' },
      title: 'Beachside villa in Nha Trang', description: 'Spacious 3-bedroom villa steps from Bãi Dài beach.',
      priceMin: 1100, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: nhaTrang.id, countryId: vietnam.id,
      lat: 12.0060, lng: 109.1420, address: 'Cam Lam District, Nha Trang',
      isPublished: true, isFeatured: false, rating: 4.6, reviewCount: 14,
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
    },
    {
      titleI18n: { en: 'Luxury pool villa in Kamala', ru: 'Люкс вилла с бассейном в Камала' },
      descriptionI18n: { en: 'Stunning 4-bedroom pool villa in a private estate in Kamala. Sea views, daily housekeeping, chef available on request.', ru: 'Великолепная 4-комнатная вилла с бассейном в частном поместье в Камала. Вид на море, горничная ежедневно, шеф-повар по запросу.' },
      title: 'Luxury pool villa in Kamala', description: 'Stunning 4-bedroom pool villa with sea views in Kamala.',
      priceMin: 3200, currency: 'USD', listingType: 'rent',
      categoryId: villas.id, cityId: phuket.id, countryId: thailand.id,
      lat: 7.9508, lng: 98.2738, address: 'Kamala, Kathu District, Phuket',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 23,
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
    },
    {
      titleI18n: { en: 'Luxury penthouse in Downtown Dubai', ru: 'Роскошный пентхаус в Даунтаун Дубай' },
      descriptionI18n: { en: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views. Private rooftop terrace, concierge, valet parking. The ultimate Dubai lifestyle.', ru: 'Захватывающий 3-комнатный пентхаус с видом на Бурдж-Халифу. Частная терраса на крыше, консьерж, парковка с парковщиком. Лучшее из Дубая.' },
      title: 'Luxury penthouse in Downtown Dubai', description: 'Breathtaking 3-bedroom penthouse with Burj Khalifa views.',
      priceMin: 8500, currency: 'USD', listingType: 'rent',
      categoryId: apartments.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1972, lng: 55.2744, address: 'Downtown Dubai, Dubai',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 12,
    },
    {
      titleI18n: { en: 'Villa for sale in Palm Jumeirah', ru: 'Вилла на продажу на Пальма Джумейра' },
      descriptionI18n: { en: 'Spectacular 5-bedroom villa for sale on Palm Jumeirah. Private beach access, infinity pool, 360° sea views. Premium finishing throughout.', ru: 'Впечатляющая вилла с 5 спальнями на продажу на Пальма Джумейра. Частный пляж, бассейн инфинити, вид на море 360°. Премиальная отделка.' },
      title: 'Villa for sale in Palm Jumeirah', description: 'Spectacular 5-bedroom villa with private beach access on Palm Jumeirah.',
      priceMin: 2500000, currency: 'USD', listingType: 'buy',
      categoryId: villas.id, cityId: dubai.id, countryId: uae.id,
      lat: 25.1124, lng: 55.1390, address: 'Palm Jumeirah, Dubai',
      isPublished: true, isFeatured: true, rating: 5.0, reviewCount: 3,
    },
  ];

  for (const listing of listings) {
    await prisma.listing.create({ data: { ...listing, providerId: provider.id } });
  }

  console.log(`✅ Seed complete — ${listings.length} listings created`);
  console.log(`   Provider login: provider@relocate.dev / Admin1234!`);
  console.log(`   New cities: Nha Trang (VN), Phuket (TH), Pattaya (TH), Dubai (AE)`);
  console.log(`   Categories: real-estate (parent) → apartments, villas`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
