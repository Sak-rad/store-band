/**
 * Geo seed — countries & cities popular for expats / digital nomads / relocation.
 * Run: cd apps/api && npx ts-node prisma/seed-geo.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GEO: Array<{
  code: string; en: string; ru: string; slug: string;
  cities: Array<{ en: string; ru: string; slug: string }>;
}> = [
  // ── Southeast Asia ──────────────────────────────────────────────────────────
  {
    code: 'TH', en: 'Thailand', ru: 'Таиланд', slug: 'thailand',
    cities: [
      { en: 'Bangkok',    ru: 'Бангкок',   slug: 'bangkok'    },
      { en: 'Phuket',     ru: 'Пхукет',    slug: 'phuket'     },
      { en: 'Pattaya',    ru: 'Паттайя',   slug: 'pattaya'    },
      { en: 'Chiang Mai', ru: 'Чиангмай',  slug: 'chiang-mai' },
      { en: 'Koh Samui',  ru: 'Ко Самуи',  slug: 'koh-samui'  },
      { en: 'Hua Hin',    ru: 'Хуа Хин',   slug: 'hua-hin'    },
      { en: 'Krabi',      ru: 'Краби',     slug: 'krabi'      },
    ],
  },
  {
    code: 'VN', en: 'Vietnam', ru: 'Вьетнам', slug: 'vietnam',
    cities: [
      { en: 'Ho Chi Minh City', ru: 'Хошимин', slug: 'ho-chi-minh-city' },
      { en: 'Hanoi',            ru: 'Ханой',   slug: 'hanoi'             },
      { en: 'Da Nang',          ru: 'Дананг',  slug: 'da-nang'           },
      { en: 'Nha Trang',        ru: 'Нячанг',  slug: 'nha-trang'         },
      { en: 'Hoi An',           ru: 'Хойан',   slug: 'hoi-an'            },
      { en: 'Dalat',            ru: 'Далат',   slug: 'dalat'             },
      { en: 'Phu Quoc',         ru: 'Фукуок',  slug: 'phu-quoc'          },
    ],
  },
  {
    code: 'ID', en: 'Indonesia', ru: 'Индонезия', slug: 'indonesia',
    cities: [
      { en: 'Bali',       ru: 'Бали',        slug: 'bali'       },
      { en: 'Jakarta',    ru: 'Джакарта',    slug: 'jakarta'    },
      { en: 'Lombok',     ru: 'Ломбок',      slug: 'lombok'     },
      { en: 'Yogyakarta', ru: 'Джокьякарта', slug: 'yogyakarta' },
      { en: 'Surabaya',   ru: 'Сурабая',     slug: 'surabaya'   },
    ],
  },
  {
    code: 'MY', en: 'Malaysia', ru: 'Малайзия', slug: 'malaysia',
    cities: [
      { en: 'Kuala Lumpur',  ru: 'Куала-Лумпур',  slug: 'kuala-lumpur'  },
      { en: 'Penang',        ru: 'Пенанг',        slug: 'penang'        },
      { en: 'Johor Bahru',   ru: 'Джохор-Бару',   slug: 'johor-bahru'   },
      { en: 'Langkawi',      ru: 'Лангкави',      slug: 'langkawi'      },
      { en: 'Kota Kinabalu', ru: 'Кота-Кинабалу', slug: 'kota-kinabalu' },
    ],
  },
  {
    code: 'PH', en: 'Philippines', ru: 'Филиппины', slug: 'philippines',
    cities: [
      { en: 'Manila',  ru: 'Манила',  slug: 'manila'  },
      { en: 'Cebu',    ru: 'Себу',    slug: 'cebu'    },
      { en: 'Davao',   ru: 'Давао',   slug: 'davao'   },
      { en: 'Boracay', ru: 'Боракай', slug: 'boracay' },
      { en: 'Palawan', ru: 'Палаван', slug: 'palawan' },
    ],
  },
  {
    code: 'SG', en: 'Singapore', ru: 'Сингапур', slug: 'singapore',
    cities: [
      { en: 'Singapore', ru: 'Сингапур', slug: 'singapore' },
    ],
  },
  // ── Middle East ─────────────────────────────────────────────────────────────
  {
    code: 'AE', en: 'UAE', ru: 'ОАЭ', slug: 'uae',
    cities: [
      { en: 'Dubai',          ru: 'Дубай',        slug: 'dubai'          },
      { en: 'Abu Dhabi',      ru: 'Абу-Даби',     slug: 'abu-dhabi'      },
      { en: 'Sharjah',        ru: 'Шарджа',       slug: 'sharjah'        },
      { en: 'Ajman',          ru: 'Аджман',       slug: 'ajman'          },
      { en: 'Ras Al Khaimah', ru: 'Рас-эль-Хайма',slug: 'ras-al-khaimah' },
    ],
  },
  {
    code: 'TR', en: 'Turkey', ru: 'Турция', slug: 'turkey',
    cities: [
      { en: 'Istanbul', ru: 'Стамбул', slug: 'istanbul' },
      { en: 'Antalya',  ru: 'Анталья', slug: 'antalya'  },
      { en: 'Ankara',   ru: 'Анкара',  slug: 'ankara'   },
      { en: 'Alanya',   ru: 'Аланья',  slug: 'alanya'   },
      { en: 'Bodrum',   ru: 'Бодрум',  slug: 'bodrum'   },
      { en: 'Mersin',   ru: 'Мерсин',  slug: 'mersin'   },
      { en: 'Izmir',    ru: 'Измир',   slug: 'izmir'    },
      { en: 'Trabzon',  ru: 'Трабзон', slug: 'trabzon'  },
    ],
  },
  {
    code: 'QA', en: 'Qatar', ru: 'Катар', slug: 'qatar',
    cities: [
      { en: 'Doha',      ru: 'Доха',      slug: 'doha'      },
      { en: 'Al Wakrah', ru: 'Аль-Вакра', slug: 'al-wakrah' },
    ],
  },
  // ── Eastern Europe / Caucasus ────────────────────────────────────────────────
  {
    code: 'GE', en: 'Georgia', ru: 'Грузия', slug: 'georgia',
    cities: [
      { en: 'Tbilisi',  ru: 'Тбилиси',  slug: 'tbilisi'  },
      { en: 'Batumi',   ru: 'Батуми',   slug: 'batumi'   },
      { en: 'Kutaisi',  ru: 'Кутаиси',  slug: 'kutaisi'  },
      { en: 'Kobuleti', ru: 'Кобулети', slug: 'kobuleti' },
      { en: 'Gudauri',  ru: 'Гудаури',  slug: 'gudauri'  },
    ],
  },
  {
    code: 'AM', en: 'Armenia', ru: 'Армения', slug: 'armenia',
    cities: [
      { en: 'Yerevan',  ru: 'Ереван',   slug: 'yerevan'  },
      { en: 'Gyumri',   ru: 'Гюмри',    slug: 'gyumri'   },
      { en: 'Vanadzor', ru: 'Ванадзор', slug: 'vanadzor' },
      { en: 'Dilijan',  ru: 'Дилижан',  slug: 'dilijan'  },
    ],
  },
  {
    code: 'AZ', en: 'Azerbaijan', ru: 'Азербайджан', slug: 'azerbaijan',
    cities: [
      { en: 'Baku',  ru: 'Баку',   slug: 'baku'  },
      { en: 'Ganja', ru: 'Гянджа', slug: 'ganja' },
      { en: 'Sheki', ru: 'Шеки',   slug: 'sheki' },
    ],
  },
  {
    code: 'RS', en: 'Serbia', ru: 'Сербия', slug: 'serbia',
    cities: [
      { en: 'Belgrade', ru: 'Белград',  slug: 'belgrade' },
      { en: 'Novi Sad', ru: 'Нови-Сад', slug: 'novi-sad' },
      { en: 'Niš',      ru: 'Ниш',     slug: 'nis'      },
    ],
  },
  {
    code: 'ME', en: 'Montenegro', ru: 'Черногория', slug: 'montenegro',
    cities: [
      { en: 'Podgorica',   ru: 'Подгорица',  slug: 'podgorica'   },
      { en: 'Budva',       ru: 'Будва',      slug: 'budva'       },
      { en: 'Kotor',       ru: 'Котор',      slug: 'kotor'       },
      { en: 'Herceg Novi', ru: 'Херцег-Нови',slug: 'herceg-novi' },
      { en: 'Bar',         ru: 'Бар',        slug: 'bar'         },
      { en: 'Tivat',       ru: 'Тиват',      slug: 'tivat'       },
    ],
  },
  {
    code: 'CZ', en: 'Czech Republic', ru: 'Чехия', slug: 'czech-republic',
    cities: [
      { en: 'Prague',       ru: 'Прага',        slug: 'prague'       },
      { en: 'Brno',         ru: 'Брно',         slug: 'brno'         },
      { en: 'Ostrava',      ru: 'Острава',      slug: 'ostrava'      },
      { en: 'Karlovy Vary', ru: 'Карловы Вары', slug: 'karlovy-vary' },
    ],
  },
  {
    code: 'HU', en: 'Hungary', ru: 'Венгрия', slug: 'hungary',
    cities: [
      { en: 'Budapest', ru: 'Будапешт', slug: 'budapest' },
      { en: 'Debrecen', ru: 'Дебрецен', slug: 'debrecen' },
      { en: 'Pécs',     ru: 'Печ',      slug: 'pecs'     },
    ],
  },
  {
    code: 'RO', en: 'Romania', ru: 'Румыния', slug: 'romania',
    cities: [
      { en: 'Bucharest',   ru: 'Бухарест',   slug: 'bucharest'   },
      { en: 'Cluj-Napoca', ru: 'Клуж-Напока', slug: 'cluj-napoca' },
      { en: 'Timișoara',   ru: 'Тимишоара',  slug: 'timisoara'   },
      { en: 'Brașov',      ru: 'Брашов',     slug: 'brasov'      },
    ],
  },
  {
    code: 'BG', en: 'Bulgaria', ru: 'Болгария', slug: 'bulgaria',
    cities: [
      { en: 'Sofia',       ru: 'София',            slug: 'sofia'        },
      { en: 'Varna',       ru: 'Варна',            slug: 'varna'        },
      { en: 'Burgas',      ru: 'Бургас',           slug: 'burgas'       },
      { en: 'Plovdiv',     ru: 'Пловдив',          slug: 'plovdiv'      },
      { en: 'Sunny Beach', ru: 'Солнечный Берег',  slug: 'sunny-beach'  },
    ],
  },
  // ── Southern Europe ──────────────────────────────────────────────────────────
  {
    code: 'PT', en: 'Portugal', ru: 'Португалия', slug: 'portugal',
    cities: [
      { en: 'Lisbon',  ru: 'Лиссабон', slug: 'lisbon'  },
      { en: 'Porto',   ru: 'Порту',    slug: 'porto'   },
      { en: 'Algarve', ru: 'Алгарве',  slug: 'algarve' },
      { en: 'Madeira', ru: 'Мадейра',  slug: 'madeira' },
      { en: 'Cascais', ru: 'Кашкайш',  slug: 'cascais' },
      { en: 'Braga',   ru: 'Брага',    slug: 'braga'   },
    ],
  },
  {
    code: 'ES', en: 'Spain', ru: 'Испания', slug: 'spain',
    cities: [
      { en: 'Madrid',       ru: 'Мадрид',       slug: 'madrid'       },
      { en: 'Barcelona',    ru: 'Барселона',    slug: 'barcelona'    },
      { en: 'Valencia',     ru: 'Валенсия',     slug: 'valencia'     },
      { en: 'Málaga',       ru: 'Малага',       slug: 'malaga'       },
      { en: 'Seville',      ru: 'Севилья',      slug: 'seville'      },
      { en: 'Alicante',     ru: 'Аликанте',     slug: 'alicante'     },
      { en: 'Tenerife',     ru: 'Тенерифе',     slug: 'tenerife'     },
      { en: 'Gran Canaria', ru: 'Гран-Канария', slug: 'gran-canaria' },
      { en: 'Ibiza',        ru: 'Ибица',        slug: 'ibiza'        },
      { en: 'Marbella',     ru: 'Марбелья',     slug: 'marbella'     },
    ],
  },
  {
    code: 'IT', en: 'Italy', ru: 'Италия', slug: 'italy',
    cities: [
      { en: 'Rome',      ru: 'Рим',       slug: 'rome'      },
      { en: 'Milan',     ru: 'Милан',     slug: 'milan'     },
      { en: 'Florence',  ru: 'Флоренция', slug: 'florence'  },
      { en: 'Venice',    ru: 'Венеция',   slug: 'venice'    },
      { en: 'Naples',    ru: 'Неаполь',   slug: 'naples'    },
      { en: 'Bologna',   ru: 'Болонья',   slug: 'bologna'   },
      { en: 'Turin',     ru: 'Турин',     slug: 'turin'     },
      { en: 'Sicily',    ru: 'Сицилия',   slug: 'sicily'    },
      { en: 'Sardinia',  ru: 'Сардиния',  slug: 'sardinia'  },
    ],
  },
  {
    code: 'GR', en: 'Greece', ru: 'Греция', slug: 'greece',
    cities: [
      { en: 'Athens',       ru: 'Афины',    slug: 'athens'       },
      { en: 'Thessaloniki', ru: 'Салоники', slug: 'thessaloniki' },
      { en: 'Crete',        ru: 'Крит',     slug: 'crete'        },
      { en: 'Rhodes',       ru: 'Родос',    slug: 'rhodes'       },
      { en: 'Santorini',    ru: 'Санторини',slug: 'santorini'    },
      { en: 'Mykonos',      ru: 'Миконос',  slug: 'mykonos'      },
      { en: 'Corfu',        ru: 'Корфу',    slug: 'corfu'        },
    ],
  },
  {
    code: 'CY', en: 'Cyprus', ru: 'Кипр', slug: 'cyprus',
    cities: [
      { en: 'Limassol',  ru: 'Лимасол',  slug: 'limassol'  },
      { en: 'Nicosia',   ru: 'Никосия',  slug: 'nicosia'   },
      { en: 'Paphos',    ru: 'Пафос',    slug: 'paphos'    },
      { en: 'Larnaca',   ru: 'Ларнака',  slug: 'larnaca'   },
      { en: 'Ayia Napa', ru: 'Айя-Напа', slug: 'ayia-napa' },
    ],
  },
  // ── Latin America ────────────────────────────────────────────────────────────
  {
    code: 'MX', en: 'Mexico', ru: 'Мексика', slug: 'mexico',
    cities: [
      { en: 'Mexico City',     ru: 'Мехико',          slug: 'mexico-city'     },
      { en: 'Cancún',          ru: 'Канкун',           slug: 'cancun'          },
      { en: 'Guadalajara',     ru: 'Гвадалахара',     slug: 'guadalajara'     },
      { en: 'Playa del Carmen',ru: 'Плая-дель-Кармен', slug: 'playa-del-carmen'},
      { en: 'Tulum',           ru: 'Тулум',            slug: 'tulum'           },
      { en: 'Oaxaca',          ru: 'Оахака',           slug: 'oaxaca'          },
      { en: 'Monterrey',       ru: 'Монтеррей',        slug: 'monterrey'       },
    ],
  },
  {
    code: 'CO', en: 'Colombia', ru: 'Колумбия', slug: 'colombia',
    cities: [
      { en: 'Medellín',   ru: 'Медельин',  slug: 'medellin'   },
      { en: 'Bogotá',     ru: 'Богота',    slug: 'bogota'     },
      { en: 'Cartagena',  ru: 'Картахена', slug: 'cartagena'  },
      { en: 'Cali',       ru: 'Кали',      slug: 'cali'       },
      { en: 'Santa Marta',ru: 'Санта-Марта',slug: 'santa-marta'},
    ],
  },
  {
    code: 'AR', en: 'Argentina', ru: 'Аргентина', slug: 'argentina',
    cities: [
      { en: 'Buenos Aires', ru: 'Буэнос-Айрес', slug: 'buenos-aires' },
      { en: 'Mendoza',      ru: 'Мендоса',      slug: 'mendoza'      },
      { en: 'Córdoba',      ru: 'Кордова',      slug: 'cordoba'      },
      { en: 'Bariloche',    ru: 'Барилоче',     slug: 'bariloche'    },
    ],
  },
  {
    code: 'BR', en: 'Brazil', ru: 'Бразилия', slug: 'brazil',
    cities: [
      { en: 'São Paulo',      ru: 'Сан-Паулу',     slug: 'sao-paulo'      },
      { en: 'Rio de Janeiro', ru: 'Рио-де-Жанейро', slug: 'rio-de-janeiro' },
      { en: 'Florianópolis',  ru: 'Флорианополис', slug: 'florianopolis'  },
      { en: 'Salvador',       ru: 'Салвадор',      slug: 'salvador'       },
    ],
  },
  {
    code: 'CR', en: 'Costa Rica', ru: 'Коста-Рика', slug: 'costa-rica',
    cities: [
      { en: 'San José',  ru: 'Сан-Хосе',  slug: 'san-jose'  },
      { en: 'Tamarindo', ru: 'Тамариндо', slug: 'tamarindo' },
      { en: 'Jacó',      ru: 'Хако',      slug: 'jaco'      },
    ],
  },
  {
    code: 'PA', en: 'Panama', ru: 'Панама', slug: 'panama',
    cities: [
      { en: 'Panama City',    ru: 'Панама-Сити',     slug: 'panama-city'    },
      { en: 'Bocas del Toro', ru: 'Бокас-дель-Торо', slug: 'bocas-del-toro' },
      { en: 'Boquete',        ru: 'Бокете',          slug: 'boquete'        },
    ],
  },
  // ── Africa / Asia Other ──────────────────────────────────────────────────────
  {
    code: 'MA', en: 'Morocco', ru: 'Марокко', slug: 'morocco',
    cities: [
      { en: 'Marrakech', ru: 'Марракеш',  slug: 'marrakech' },
      { en: 'Casablanca',ru: 'Касабланка', slug: 'casablanca'},
      { en: 'Agadir',    ru: 'Агадир',    slug: 'agadir'    },
      { en: 'Rabat',     ru: 'Рабат',     slug: 'rabat'     },
      { en: 'Fez',       ru: 'Фес',       slug: 'fez'       },
      { en: 'Tangier',   ru: 'Танжер',    slug: 'tangier'   },
    ],
  },
  {
    code: 'JP', en: 'Japan', ru: 'Япония', slug: 'japan',
    cities: [
      { en: 'Tokyo',   ru: 'Токио',   slug: 'tokyo'   },
      { en: 'Osaka',   ru: 'Осака',   slug: 'osaka'   },
      { en: 'Kyoto',   ru: 'Киото',   slug: 'kyoto'   },
      { en: 'Fukuoka', ru: 'Фукуока', slug: 'fukuoka' },
      { en: 'Sapporo', ru: 'Саппоро', slug: 'sapporo' },
    ],
  },
  {
    code: 'KR', en: 'South Korea', ru: 'Южная Корея', slug: 'south-korea',
    cities: [
      { en: 'Seoul', ru: 'Сеул',  slug: 'seoul' },
      { en: 'Busan', ru: 'Пусан', slug: 'busan' },
      { en: 'Jeju',  ru: 'Чеджу', slug: 'jeju'  },
    ],
  },
  {
    code: 'KZ', en: 'Kazakhstan', ru: 'Казахстан', slug: 'kazakhstan',
    cities: [
      { en: 'Almaty',   ru: 'Алматы',  slug: 'almaty'   },
      { en: 'Astana',   ru: 'Астана',  slug: 'astana'   },
      { en: 'Shymkent', ru: 'Шымкент', slug: 'shymkent' },
    ],
  },
];

async function main() {
  let countriesUpserted = 0;
  let citiesUpserted = 0;

  for (const country of GEO) {
    const record = await prisma.country.upsert({
      where: { code: country.code },
      update: {
        name: country.en,
        nameI18n: { en: country.en, ru: country.ru },
        slug: country.slug,
      },
      create: {
        code: country.code,
        name: country.en,
        nameI18n: { en: country.en, ru: country.ru },
        slug: country.slug,
      },
    });
    countriesUpserted++;

    for (const city of country.cities) {
      // Use findFirst+update/create to handle existing rows that may have null slug
      const existing = await prisma.city.findFirst({
        where: { name: city.en, countryId: record.id },
      });
      if (existing) {
        await prisma.city.update({
          where: { id: existing.id },
          data: { nameI18n: { en: city.en, ru: city.ru }, slug: city.slug },
        });
      } else {
        await prisma.city.create({
          data: {
            name: city.en,
            nameI18n: { en: city.en, ru: city.ru },
            slug: city.slug,
            countryId: record.id,
          },
        });
      }
      citiesUpserted++;
    }
  }

  console.log(`✅ Done: ${countriesUpserted} countries, ${citiesUpserted} cities upserted`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
