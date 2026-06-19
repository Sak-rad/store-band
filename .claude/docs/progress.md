# Progress Log

Хронологический лог всех значимых изменений. Пишу сюда после каждой сессии.

---

## 2026-06-18 — Authorization gap (chat + bookings) + Jest setup

Аудит показал, что проверка прав делалась непоследовательно по методам. `listings`, `reviews`, `favorites`, `providers`, `users` — уже корректны. Дыры были в двух модулях; закрыты inline-проверками в сервисах (в стиле остального кода, без нового guard-слоя).

**Chat — IDOR (любой залогиненный читал/писал в чужой чат):**
- `chat.service.ts` — добавлены `isMember(chatId, userId)` (public, для gateway) и приватный `assertMembership()`. Вызовы в `findOne`, `getMessages`, `createMessage`, `markRead`, `pinMessage`. Сигнатуры `findOne`/`getMessages`/`pinMessage` теперь принимают `userId`.
- `chat.controller.ts` — пробрасывает `@CurrentUser('id')` в `findOne`/`getMessages`/`pinMessage`.
- `chat.gateway.ts` — `chat:join` теперь async и проверяет `isMember` перед `client.join`. `message:send`/`message:read` защищены на уровне сервиса.

**Bookings:**
- `bookings.service.ts` — `findOne` больше не игнорирует `userId` (проверка владелец/провайдер/админ через `assertCanAccess`). `update` (смена статуса) требует провайдера листинга или админа (`isAdmin`). `findAll` для PROVIDER теперь скоупится `listing.provider.userId`, а не отдаёт все брони системы.
- `bookings.controller.ts` — `update` пробрасывает `@CurrentUser('id')`.

**Тесты (рантайма не было вообще):**
- Поставлены `jest`, `ts-jest`, `@types/jest` в `@meriloz/api`. `jest.config.js`, `tsconfig.spec.json` (types jest + include специй), `test` скрипт = `jest`.
- `tsconfig.json` — добавлен `exclude: ["**/*.spec.ts"]`, чтобы специи не попадали в прод-сборку `nest build`.
- `.eslintrc.js` — `project: ["tsconfig.json", "tsconfig.spec.json"]`.
- Unit-тесты на authz: `chat.service.spec.ts`, `bookings.service.spec.ts` — 20 тестов (чужой юзер → Forbidden, владелец/провайдер/админ → ok, скоуп findAll). Все зелёные. `tsc` и `lint` чисто.

**Известный долг (не трогали в этой сессии):** фронт `ChatWindow` — `typing:stop` не шлётся при уходе/без отправки; серверный `onlineUsers` — один сокет на юзера (мультивкладки ломают доставку); `POST /messages` принимает `body: any` без DTO.

### Этап 1 вертикалей — kind-слой на детальной карточке (фронт, без миграции)

Решение по продукту: разносим на вертикали (недвижимость/услуги/впечатления) на общем ядре; «Места» = отдельная контент-модель `Article` с курируемыми подборками листингов (следующие этапы). Ось рендеринга — `kind` (`STAY | SALE | EXPERIENCE | SERVICE`).

Этап 1 — починка видимого бага «$50/мес на экскурсии» без трогания БД (`kind` выводится из категории):
- `apps/web/src/shared/lib/listing-kind.ts` — `getListingKind()` (из category.slug + listingType) и `getPriceSuffixKey()`.
- `widgets/listing-detail/ui/ContactCard.tsx` (+scss) — сайдбар для SALE/EXPERIENCE/SERVICE: цена + CTA «связаться» (открывает чат), без диапазона дат.
- `widgets/listing-detail/ui/BookingPanel.tsx` — выбирает `CreateBookingForm` (STAY) vs `ContactCard` (остальные).
- `ListingDetail.tsx` / `ListingSheet.tsx` — цена теперь kind-aware (период / «от» / «Цена по запросу»), сайдбар через `BookingPanel`. Заодно убрали дубль логики цены/брони между двумя компонентами.
- `CreateBookingForm.tsx` — убран хардкод `/ мес.` (был русский текст даже в EN-локали) → kind-aware суффикс.
- i18n: добавлены `perPerson`, `priceFrom`, `priceOnRequest`, `requestViewing` (en+ru).

Проверки: web `tsc --noEmit` ✅, `next lint` по затронутым файлам ✅, JSON валиден.

**Долг по этому срезу:** EXPERIENCE пока ведёт на `ContactCard` — нужна отдельная форма «дата + кол-во человек» (Этап 1b). `kind` ещё не колонка в БД (выводится на фронте) — формализуем enum-полем при расколе на вертикали (Этап 2). Web-тестов нет (jest стоит только в API) — `getListingKind`/`getPriceSuffixKey` стоит покрыть.

### Этап 1b — бронь экскурсий (цена за человека)

- `bookings.service.ts` `create()` — теперь kind-aware: экскурсия (`category.slug === 'excursions'`) тарифицируется `priceMin × guestCount` и **не** проверяет конфликт дат; аренда — как было (ночи × цена + проверка пересечений). Листинг тянется первым (с `category`), потом ветвление. Помечено TODO: перейти на `listing.kind` после миграции.
- `features/create-booking/ui/ExperienceBookingForm.tsx` (+scss) — дата + кол-во人, живой расчёт total, шлёт `checkIn === checkOut`.
- `BookingPanel` — EXPERIENCE → `ExperienceBookingForm`.
- i18n: `booking.date` (en+ru).
- Тесты: `bookings.service.spec.ts` +3 (экскурсия per-person без conflict-check; аренда ночи×цена + conflict-check; checkout≤checkin → BadRequest). Всего 23 теста зелёные.

Проверки: API jest 23/23 ✅, API `tsc` ✅, web `tsc` ✅, `next lint` ✅.

**БД на 5433 не поднята** — миграцию `kind` отложили; всё сделанное проверяемо без БД (фронт + моки Prisma).

### Этап 2 (часть) — `kind` стал колонкой в БД

Дев-инфра поднята (Docker Desktop был выключен → `open -a Docker`; `docker compose -f docker-compose.dev.yml up -d postgres redis`).

- `schema.prisma` — enum `ListingKind { STAY SALE EXPERIENCE SERVICE }` + `Listing.kind ListingKind @default(SERVICE)`.
- Применение на дев: **не через `db push`** (он хотел дропнуть вручную-управляемый `searchVector`), а точечным SQL через `prisma db execute` (CREATE TYPE + ADD COLUMN + бэкфилл из category/listingType). Бэкфилл: 16 STAY + 1 SALE.
- Прод: создан файл миграции `prisma/migrations/20260618000000_add_listing_kind/migration.sql` (прод применяет `migrate deploy` — см. docker-entrypoint.sh).
- `src/modules/listings/listing-kind.util.ts` — `deriveListingKind(slug, listingType)` — единый источник (синхронен с SQL-бэкфиллом).
- `listings.service.create` — тянет slug категории, проставляет `kind`.
- `bookings.service.create` — теперь `listing.kind === 'EXPERIENCE'` (убрана временная деривация по slug); спек-моки обновлены.
- `seed.ts` — проставляет `kind` через `deriveListingKind`.
- Фронт `shared/lib/listing-kind.ts` — `getListingKind` предпочитает `listing.kind` из API, деривация осталась как fallback.

Проверки: API jest 23/23 ✅, API `tsc` ✅, web `tsc` ✅, пересев сидов прошёл, `kind` в БД корректен.

**Дев-данные:** в БД оказались листинги двух провайдеров — старый `provider@relocate.dev` (до ребрендинга) и текущий `provider@meriloz.com`. `seed` чистит только текущего → после пересева 34 листинга (по 17). Это артефакт смены email при ребрендинге, не баг `kind`. Надо почистить стейл `relocate.dev` (не делал без подтверждения).

### Чистка стейл-данных
Удалён `provider@relocate.dev` (17 листингов + юзер, каскадом) — оставлен только `provider@meriloz.com`. В БД ровно 17 листингов (16 STAY + 1 SALE).

### Этап 2 (роуты вертикалей) — первый срез

Бэкенд:
- `ListingsFilterDto` + `listings.search.service` — добавлен фильтр `kind` (одиночный или comma-separated → `where.kind = { in: [...] }`).
- `listings.search.service.spec.ts` — 3 теста на фильтр. Всего API-тестов: **26**.

Фронт:
- `shared/lib/verticals.ts` — `VERTICALS` (real-estate→STAY,SALE · experiences→EXPERIENCE · services→SERVICE) + `kindParam()`.
- `widgets/catalog/VerticalCatalog.tsx` (+scss) — общий серверный компонент: SEO (title/desc/hreflang/JSON-LD из listings-i18n + гео из сегментов), фетч с `kind`, рендер `SearchBar` + `ListingGrid`. Экспортит `buildVerticalMetadata`.
- Роуты `app/[locale]/(main)/{real-estate,experiences,services}/[[...segments]]/page.tsx` — тонкие, гео через optional catch-all.
- `SearchBar` — добавлен опц. `basePath` (дефолт `/listings`, существующая страница не затронута) → поиск остаётся в вертикали.
- `Header` — общий «Объявления» заменён на 3 раздела; nav-i18n `realEstate/experiences/services`.
- i18n: `pageTitle/pageDesc['real-estate']` (en+ru).

Проверки: API jest 26/26 ✅, API/web `tsc` ✅, `next lint` затронутых файлов ✅, JSON валиден.

**Проверено end-to-end** (SSR HTML через curl, API+web подняты на 3001/3000):
- API `kind`: no-filter=17, STAY,SALE=17, STAY=16, SALE=1, EXPERIENCE=0, SERVICE=0 (точно совпадает с БД).
- `/en/real-estate` → 200, h1 «Real estate abroad», 15 карточек, total 17.
- `/en/experiences`, `/en/services` → 200, корректный title, переведённое пустое состояние, 0 карточек (нет EXPERIENCE/SERVICE сидов), без утечки данных.
- `/ru/real-estate` → 200, h1 «Недвижимость за рубежом» (локализация).
- `/en/real-estate/uae` → 200, 3 карточки, title «Real estate abroad in UAE» (гео-сегмент + location-aware SEO).
- Регресс: `/en/listings` по-прежнему 200 + 15 карточек. `/listings` остался рабочим, но убран из nav.

**Долг Этапа 2b:** `FilterPanel` жёстко завязан на `/listings` (regex + `buildListingsPath` + `clearAll`) и показывает все категории — в вертикали пока не встроен (нет сайдбар-фильтра). Нужна параметризация `basePath` + `allowedCategories` и прогон в браузере. Гео-сужение в вертикалях пока только через URL-сегменты.

### Этап 2b — `FilterPanel` в вертикалях (закрыт долг выше)

Фронт-онли, без миграции и без правок API (бэк уже комбинирует `kind` + `category` + `listingType` через AND в `where`).

- `shared/lib/listing-segments.ts` — `buildListingsPath(filters, basePath = '/listings')`: добавлен опц. `basePath`, дефолт сохраняет старое поведение `/listings`.
- `shared/lib/verticals.ts` — в `VerticalConfig` добавлено поле `categories: string[]` (real-estate→`real-estate/apartments/villas` · experiences→`excursions` · services→`services/transport/food/healthcare/education`).
- `features/listing-search/ui/FilterPanel.tsx` — пропсы `{ basePath = '/listings', categories? }`. `extractSegments(pathname, basePath)` (regex из basePath с экранированием), все `buildListingsPath` и `clearAll` пробрасывают `basePath`. Секции скоупятся: Real Estate рендерится только если в `categories` есть RE-слаг; Services маппит пересечение `SERVICES ∩ categories` (рендер только при непустом). `categories === undefined` → показываем всё (поведение `/listings` не тронуто).
- `widgets/catalog/VerticalCatalog.tsx` — добавлен `FilterPanel` (десктоп-сайдбар + мобильный) с `basePath=/<slug>` и `categories=vertical.categories`; `parseSegments` теперь даёт `category`/`listingType` в `gridFilters` (раньше дропались — сегмент категории не фильтровал грид).
- `VerticalCatalog.module.scss` — раскладка sidebar/main/mobile_filter по образцу `listings.module.scss`.

Проверки: web `tsc --noEmit` ✅, `next lint` затронутых ✅.

**Проверено end-to-end** (API+web на 3001/3000, SSR через curl):
- API `kind=STAY,SALE`=17 → `+category=apartments`=11 (все STAY/apartments) → `+villas`=6 (11+6=17).
- SSR карточек: `/en/real-estate`=15 (1-я стр. из 17), `/apartments`=11, `/villas`=6, `/uae/apartments`=2 (гео+категория, h1 «…in UAE»). experiences/services=0 с локализованным h1. Регресс `/en/listings`=15.
- Скоуп чипов `FilterPanel` в SSR: real-estate → только Apartments/Villas; services → Transport/Healthcare/Education/Food; experiences → только Excursions; `/listings` → все. Утечки чужих категорий нет.

**Остаток долга:** web-тестов всё ещё нет (`getListingKind`/`getPriceSuffixKey`/`buildListingsPath` стоит покрыть). Чат-долг с этапа безопасности (typing:stop, мультисокеты, DTO на `POST /messages`) не трогали. Всё сделанное по вертикалям ещё не закоммичено.

### `/listings` остаётся, но canonical разводит дубли с вертикалями

Решение: `/listings` НЕ выпиливаем — это легитимный сквозной каталог (поиск по всем kind, посадка после логина, футер, MobileNav, крошки, sitemap; из nav-Header убран ещё на Этапе 2). Проблема была только в дублях: `/listings/uae/apartments` и `/real-estate/uae/apartments` отдавали почти одно и оба были self-canonical.

- `shared/lib/verticals.ts` — `verticalForFilters({category, listingType})`: reverse-lookup категории/типа → владеющая вертикаль (`listingType` rent/buy/short-term → real-estate). Гео/без-фильтра → `null`.
- `app/[locale]/(main)/listings/[...segments]/page.tsx` `generateMetadata` — если refinement принадлежит вертикали, `canonical` + `hreflang(en/ru/x-default)` указывают на URL вертикали с тем же гео и **без** category-сегмента (зеркалит canonical-логику `VerticalCatalog`, где path = slug+гео). Чистый `/listings` и pure-geo `/listings/<country>` остаются self-canonical.

Ключевое — конвергенция без цепочек: `/listings/apartments` и `/real-estate/apartments` оба → `/real-estate` (а он self-canonical). `/listings/uae/apartments` и `/real-estate/uae/apartments` оба → `/real-estate/uae`.

Проверки: web `tsc` ✅, `next lint` ✅. SSR-сверка canonical:
- `/en/listings`→self, `/en/listings/uae`→self, `/en/listings/apartments`→`/en/real-estate`, `/villas`→`/en/real-estate`, `/uae/apartments`→`/en/real-estate/uae`, `/apartments/rent`→`/en/real-estate`, `/excursions`→`/en/experiences`, `/transport`→`/en/services`. `ru` сохраняет локаль. hreflang en/ru/x-default тоже → вертикаль.

**Не делал (продуктовый выбор):** репойнт плиток категорий/направлений на главной с `/listings/*` на вертикали — опционально, canonical уже закрывает SEO. Полное выпиливание /listings отложено до аналитики использования.

### Сиды: наполнили experiences и services (были по 0)

`prisma/seed.ts` — `experiences` и `services` отдавали пустые страницы. Добавил данные так, чтобы каждый раздел был ≥10 карточек.

- Захвачены все категории из `Promise.all` (раньше — только `apartments`/`villas`); `slugByCategoryId` расширен на excursions/transport/services/food/healthcare/education, иначе `deriveListingKind` получал `undefined` slug и всё валилось бы в `SERVICE` по дефолту.
- +10 EXPERIENCE (excursions, цена за человека $30–95: Пханг Нга, Пхи-Пхи, Коралловый о-в, сафари в Дубае, Халонг, Меконг, Ку Чи, Ба На Хиллс, Нячанг и т.д.) — раскиданы по phuket/pattaya/dubai/hcmc/hanoi/danang/nhaTrang.
- +12 SERVICE (transport/services/food/healthcare/education: трансфер, аренда скутера, водитель, визаран, релокейшн-консьерж, уборка, доставка еды, частный шеф, страховка, запись к врачу, репетитор, подбор школы).
- Фото переиспользуют существующие наборы `PHOTOS` (тематически), без новых Unsplash-id (чтобы не плодить битые ссылки). `listingType: 'service'` на не-real-estate (на `kind` не влияет, нужен лишь для единой формы массива `as const`).

Итого 39 листингов. Проверки: пересев ✅, API jest 26/26 ✅. По `kind`: STAY+SALE=17, EXPERIENCE=10, SERVICE=12. SSR: `/en/real-estate`=15 (стр.1 из 17), `/en/experiences`=10, `/en/services`=12 карточек. Детальные страницы экскурсии (id 61) и услуги (id 73) → 200.

### Фикс битых фоток (504 Gateway Timeout на `/_next/image`)

Диагностика по жалобе «все фото 504»: две независимые причины.
1. **Серверный оптимизатор Next** (`/_next/image`) не может скачать оригинал с `images.unsplash.com` из dev-окружения (его fetch/undici не идёт через прокси, в отличие от браузера) → таймаут 504 даже для валидных id. Подтверждено: shell-curl на валидный id = 200, тот же URL через `/_next/image` = 504 за ~7с.
2. **5 битых photo-id** в исходных наборах `PHOTOS` (404 на самом Unsplash): `apt_cozy[1,2]`, `villa_pool[0]`, `villa_garden[2]`, `dubai[2]` (у одного вообще не-hex `...akca`). Просканировал все 27 id — заменил битые на проверенные-200.

Фиксы:
- `apps/web/next.config.ts` — `images.unoptimized: process.env.NODE_ENV !== 'production'`. В dev браузер грузит исходники напрямую (минуя серверный оптимизатор, которому не дотянуться) — 504 уходит. В проде оптимизация остаётся (там egress есть, и картинки идут с R2, не с Unsplash).
- `apps/api/prisma/seed.ts` `PHOTOS` — 5 битых id заменены на валидные из тех же тем.

Проверки: пересев ✅. SSR `/en/real-estate`: 15 `<img>`, 0 `/_next/image`, прямые `src` на Unsplash. Прогон всех 22 уникальных id трёх вертикалей на Unsplash → 0 битых. imgs=links по вертикалям: 15/10/12.

### Фикс: цена не меняется сразу при смене валюты в хедере

Корень — реактивность Zustand. `formatPrice` был методом стора, читающим `get()`; селектор `useCurrencyStore(s => s.formatPrice)` возвращал стабильную ссылку → компонент не подписан на `displayCurrency`/`usdToRub` и не перерендеривался при тоггле. Цена обновлялась только при стороннем ререндере. Так было во всех 7 потребителях (`ListingCard`, `ContactCard`, `ListingDetail`, `ListingSheet`, `CreateBookingForm`, `ExperienceBookingForm`, `AdminListingsPanel`).

- `shared/store/currency.store.ts` — убран метод `formatPrice` из стора; добавлен хук `useFormatPrice()`, который подписывается на `displayCurrency` + `usdToRub` (чистая `format()`-функция вынесена наружу). Без `useCallback` — идентичность формата никому не нужна (все зовут в рендере); React 18.3.1, компилятора нет.
- 7 потребителей: `useCurrencyStore(s => s.formatPrice)` → `useFormatPrice()` (call-site `formatPrice(x)` не тронут).

Проверки: web `tsc` ✅, `next lint` ✅, страницы вертикалей и детальные 200.

### Фикс: выбор валюты сбрасывался на RUB после перезагрузки (ru-локаль)

`Providers.tsx` `AppInit` форсил RUB при `!userSet && locale==='ru'`. Гонка гидратации persist: init-эффект отрабатывал с до-гидратационным `userSet=false` и **затирал** восстановленный из localStorage выбор (и пере-сохранял `userSet=false`) → на каждой перезагрузке откат к RUB. (Node-тест с мок-стораджем показывал синхронную гидратацию, но в реальном Next-клиенте эффект всё равно опережал — подтверждено в браузере.)

- `shared/ui/Providers.tsx` — локаль-дефолт применяется только после гидратации: `if (persist.hasHydrated()) apply(); else persist.onFinishHydration(apply)`, состояние читается через `getState()` (свежее, не из реактивного селектора). Дефолт RUB остаётся «удобством первого визита», сохранённый выбор всегда побеждает.

**Проверено реально в headless Chrome (CDP)** — воспроизвёл баг на исходном коде (reload → RUB), затем с фиксом: первый визит ru → RUB (дефолт цел), клик → USD, reload → USD, ещё reload → USD. localStorage: `userSet:true` держится. web `tsc` ✅ `lint` ✅.

---

## 2026-05-19 — Security audit + local env setup

### Security fixes (все файлы изменены в этой сессии)

**Критичный баг исправлен:**
- `apps/web/src/shared/lib/api.ts` — дедлок при невалидном refresh токене
  - Если `/auth/refresh` возвращал 401, interceptor ставил его в очередь пока `isRefreshing=true` → Promise никогда не резолвился → пользователь не разлогинивался
  - Фикс: `original.url?.includes('/auth/refresh')` → сразу reject

**Безопасность:**
- `apps/api/src/modules/auth/auth.service.ts` — refresh токен теперь хранится как SHA-256 хеш
  - `hashToken()` метод: `crypto.createHash('sha256').update(token).digest('hex')`
  - Все lookup/delete по хешу
  - Явный `type: argon2.argon2id` + `parallelism: 1` в argon2 options

**Защита от DoS:**
- `apps/api/src/modules/auth/dto/register.dto.ts` — `MaxLength(128)` на password, `MaxLength(254)` на email, `MaxLength(100)` на name
- `apps/api/src/modules/auth/dto/login.dto.ts` — `MaxLength(128)` на password, `MaxLength(254)` на email

**Rate limiting:**
- `apps/api/src/modules/auth/auth.controller.ts` — `@Throttle({ default: { limit: 20, ttl: 60000 } })` на `/auth/refresh`
- Там же: `req.headers['user-agent'] ?? 'unknown'` во всех эндпоинтах

**Infrastructure:**
- `apps/api/src/main.ts` — `app.set('trust proxy', 1)` для корректного IP за Railway/Nginx

**Cleanup:**
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — удалён мёртвый cookie extractor (`access_token` cookie никогда не выставлялся фронтом)

**i18n fix:**
- `apps/api/i18n/en/errors.json` и `ru/errors.json` — исправлен placeholder с `{max}` на `{constraints.0}` для nestjs-i18n v10

### Local environment setup

- Создан `apps/api/.env` с локальными значениями
- Порт postgres в `docker-compose.dev.yml` изменён с 5432 → **5433** (5432 занят локальным Postgres.app)
- `DATABASE_URL` в `.env` обновлён на порт 5433
- `docker-compose.dev.yml` — убран лишний `version: '3.9'` тег (obsolete warning)

### Database

- Поднят PostgreSQL 16 в Docker на порту 5433
- Поднят Redis 7 в Docker на порту 6379
- Применена схема через `prisma db push --force-reset` (старая migration не совпадала со схемой)
- Вручную применён `add_search_vector.sql` (с исправлением HAVING → WHERE в `listings_within_radius`)
- Исправлена функция `listings_within_radius`: `HAVING` → `WHERE` inline + `least(1.0, ...)` защита
- Засеяно: 17 listings, 6 countries, 11 cities, 8 categories, 1 provider, 7 reviewers

### Документация создана

- `CLAUDE.md` — главный файл для быстрого контекста
- `.claude/docs/security.md` — аудит безопасности
- `.claude/docs/deploy.md` — план деплоя
- `.claude/docs/architecture.md` — архитектура системы
- `.claude/docs/progress.md` — этот файл

### Тесты авторизации (все прошли)

```
✅ POST /auth/register       → 201 + { accessToken, user }
✅ POST /auth/login          → 200 + { accessToken, user }
✅ GET  /auth/me с токеном   → 200 + { id, email, name, role, ... }
✅ GET  /auth/me без токена  → 401
✅ POST /auth/refresh        → 200 + новый accessToken (cookie rotation)
✅ POST /auth/logout         → 204
✅ POST /auth/refresh после logout → 403 (хеш не найден в DB)
✅ Неверный пароль           → 401 "Invalid email or password"
✅ Слабый пароль (register)  → 400 validation errors
✅ Длинный пароль (129 chars) → 400 "Maximum 128 characters allowed"
✅ Дублирующийся email       → 409 "This email is already registered"
✅ DB: refresh tokens хранятся как SHA-256 (64 hex chars)
```

---

## 2026-05-23 — Rebrand + Railway deploy fixes + Homepage redesign + Auth modal

### Rebrand: Relocate → Meriloz (через Roamly)

Переименование прошло в два этапа: сначала → Roamly, потом пользователь сменил на Meriloz.

**Затронутые файлы:**
- `package.json`, `apps/api/package.json`, `apps/web/package.json` — имена пакетов → `@meriloz/*`
- `apps/web/src/shared/ui/Header.tsx`, `Footer.tsx` — логотип и название
- `apps/web/src/app/[locale]/layout.tsx` — title template
- `apps/web/public/manifest.json` — PWA manifest
- `apps/web/messages/en.json`, `ru.json` — `listingsSiteName`
- `apps/api/src/modules/notifications/email.service.ts` — email subject
- `apps/api/prisma/seed.ts` — email-домены провайдеров

### Railway production deploy

**Исправленные ошибки:**
- `invalid tag ... must be lowercase` — в deploy.yml захардкожено `sak-rad/store-band/api` (lowercase)
- `ERR_PNPM_NO_LOCKFILE` — добавлен `pnpm-lock.yaml` в COPY в обоих Dockerfile
- `node_modules/.prisma not found` — pnpm workspace кладёт prisma client в `apps/api/node_modules/.prisma`, не в root; исправлен COPY путь в Dockerfile
- `Cannot find module dist/src/main.js` — Railway dashboard использовал старое имя пакета `@relocation/api`, pnpm молча пропускал → dist не создавался; обновлено вручную
- `i18n path cannot be found` — i18n файлы лежат в `apps/api/i18n/`, `__dirname` = `dist/src` → путь `../..` корректный; откатили ошибочный фикс
- `Cannot find .next/standalone/server.js` — Next.js без `output: standalone`; стартовая команда изменена на `pnpm --filter @meriloz/web run start`

**Финальные команды Railway:**
- API build: `pnpm install --frozen-lockfile --filter @meriloz/api && pnpm --filter @meriloz/api exec prisma generate && pnpm --filter @meriloz/api run build`
- API start: `apps/api/node_modules/.bin/prisma migrate deploy --schema apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js`
- Web build: `pnpm install --frozen-lockfile --filter @meriloz/web && pnpm --filter @meriloz/web run build`
- Web start: `pnpm --filter @meriloz/web run start`

### Правила разработки (добавлены в CLAUDE.md)

- После каждой фичи — запуск тестов (`pnpm test`, `tsc --noEmit`, `pnpm lint`)
- Коммиты — человекоподобные, без AI-атрибуции, короткий imperative subject
- Никогда не упоминать CLAUDE.md, Claude или AI в коде, коммитах, комментариях

### Цветовая палитра — полная смена

Заменена "AI SaaS template" палитра (`#0EA5E9` sky blue + тёмный hero с orbs) на редакционную/тревел тему:

- `$color-primary`: `#1C4532` (тёмный лесной зелёный)
- `$color-accent`: `#E8603A` (тёплый коралловый — CTA кнопки)
- `$color-background`: `#FAF8F5` (тёплый кремовый вместо холодного белого)
- `$color-border`: `#DDD8D0` (тёплый серый)
- Обновлены: `variables.scss`, `mixins.scss` (`btn-primary`, `input-base`, `focus-ring`)
- Логотип в Header и Footer — зелёный круг с коралловой точкой

### Главная страница — полный редизайн (`page.tsx` + `page.module.scss`)

**Новая структура:**
1. **Hero** — split layout (текст слева, мозаика направлений справа); тёплый кремовый фон, никаких тёмных gradient orbs; поиск с коралловой кнопкой; чипсы категорий
2. **Featured listings** — реальные данные из API (`GET /listings?limit=6&sort=rating_desc`), server-side fetch с `revalidate: 300`
3. **Popular destinations** — 4 карточки с CSS градиентами (Nha Trang, Phuket, Pattaya, Dubai)
4. **Categories** — Lucide иконки вместо emoji, 8 категорий
5. **Provider CTA** — тёмно-зелёная секция с преимуществами и коралловой CTA кнопкой

**SEO:**
- JSON-LD: `WebSite` schema + `SearchAction` + `Organization`
- `generateMetadata` с `alternates.languages` (hreflang en/ru), OpenGraph, Twitter card
- Правильная иерархия h1/h2, aria-label на всех секциях
- Семантический `<nav>` для категорий

**Мобильная адаптация:**
- Hero мозаика скрыта на планшете/мобилке
- Поиск стакается в колонку на мобилке (кнопка на всю ширину)
- `overflow-x: hidden` на `.home` и hero для предотвращения горизонтального скролла

### Auth Modal

**Новые файлы:**
- `src/shared/store/auth-modal.store.ts` — Zustand стор: `openLogin()`, `openRegister()`, `setTab()`, `close()`
- `src/shared/ui/AuthModal.tsx` — модал с переключением login/register вкладок
- `src/shared/ui/AuthModal.module.scss` — десктоп: центрированный модал + backdrop; мобилка: full-screen sheet снизу вверх с `safe-area-inset-bottom`

**Изменённые файлы:**
- `LoginForm.tsx`, `RegisterForm.tsx` — добавлен опциональный `onSuccess?: () => void` (в модале — закрывает, на странице — редирект как раньше)
- `Header.tsx` — кнопки `<button onClick={openLogin}>` вместо `<Link href="/login">`
- `Providers.tsx` — `lazy()` + `Suspense` для модала: чанк грузится только при первом открытии

---

## Следующие сессии — план

### Приоритет 1: Production deploy
- [ ] Railway аккаунт + подключить GitHub репо
- [ ] Настроить Railway сервисы (API, Web, Postgres plugin, Redis plugin)
- [ ] Cloudflare R2 bucket + API keys
- [ ] Домен + SSL
- [ ] Env vars в Railway dashboard
- [ ] Первый деплой + проверка health endpoint
- [ ] Применить `add_search_vector.sql` на prod DB
- [ ] Залить seed данные

### Приоритет 2: CI/CD
- [ ] GitHub Actions workflow: lint → build → deploy on push to main

### Приоритет 3: Features
- [ ] Admin panel (listing moderation: approve/reject)
- [ ] Email notifications (Resend) для бронирований
- [ ] OAuth (Google) через существующую Account модель в схеме

---

## 2026-05-23 — Home page RSC fixes

### Проблема: `Cannot read properties of undefined (reading 'call')`
- Корень: `FeaturedListings.tsx` лежал в `app/[locale]/` — Next.js 15 по-особому бандлит файлы в app-директории, из-за чего `ListingCard` не попадал в `page_client-reference-manifest.js`
- Фикс: перенесён в `src/widgets/home/FeaturedListings.tsx` с собственным `FeaturedListings.module.scss`
- `page.tsx` загружает его через `next/dynamic` (lazy, вне RSC manifest)

### Правило зафиксировано
- `app/` — только серверные роут-файлы (`page.tsx`, `layout.tsx`, etc.)
- Все клиентские компоненты (`"use client"`) — в `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`

### Hydration mismatch (цена в карточке листинга)
- Сервер рендерил `$2,200` (USD), клиент читал из Zustand persist (RUB) → несоответствие
- `suppressHydrationWarning` стоял на `<p>`, но React проверяет только тот элемент — перенесён на `<strong>` где реально живёт текст цены

### CORS
- Web работал на порту 3002, API разрешал только `localhost:3000`
- `apps/api/src/main.ts`: в dev-режиме origin-функция пропускает любой `http://localhost:*`, в проде — строго `CLIENT_URL`

### Известные технические долги
- Migration history не синхронизирована с реальной схемой (использовали `db push`)
  - Перед серьёзным продом нужно создать чистую `prisma migrate dev --name init` от текущей схемы
- `seed-geo.ts` в `apps/api/prisma/` — не ясно что делает, нужно изучить
- MinIO console открыт на порту 9001 без аутентификации на staging — закрыть перед публичным staging
