# Progress Log

Хронологический лог всех значимых изменений. Пишу сюда после каждой сессии.

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
