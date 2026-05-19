# Architecture

Last updated: **2026-05-19**

---

## Обзор системы

```
Browser
  │
  ├── Next.js (Web, port 3000)
  │     ├── App Router + next-intl (en/ru)
  │     ├── Zustand (auth state, access token в памяти)
  │     ├── React Query (server state, кэш)
  │     └── Axios → api.ts (interceptors, refresh queue)
  │
  └── NestJS API (port 3001)
        ├── Auth module (JWT + refresh rotation)
        ├── Users / Providers / Listings / Bookings
        ├── Reviews / Favorites / Chat (WS) / Notifications
        ├── Uploads (S3) / Currency / Countries / Cities
        ├── Prisma ORM → PostgreSQL
        ├── Bull queues → Redis (email, notifications)
        └── Socket.IO (chat, real-time)
```

---

## Auth flow

```
1. POST /auth/register или /auth/login
   → API: хэшируем пароль Argon2id, генерируем токены
   → Response body: { accessToken, user }
   → Set-Cookie: refresh_token=<plain_token>; HttpOnly; SameSite=None; Secure
   → DB Session: { refreshToken: SHA256(plain_token), userId, ip, userAgent, expiresAt }

2. Клиент хранит:
   - accessToken → Zustand memory (теряется при reload)
   - user → Zustand + localStorage (persisted для мгновенного рендера)
   - refreshToken → httpOnly cookie (браузер управляет)

3. При reload страницы (Providers.tsx):
   - user есть в store, accessToken нет
   → POST /auth/refresh (cookie автоматически в запросе)
   → API: SHA256(cookie_token), ищет в DB, rotation
   → Новый accessToken в memory

4. При 401 на любом запросе (api.ts interceptor):
   - Если isRefreshing=false → запускаем refresh, остальные в очередь
   - Если refresh сам вернул 401 → logout + redirect /login (deadlock защита)
   - После успешного refresh → повторяем все заблокированные запросы

5. POST /auth/logout
   → Удаляем сессию из DB по SHA256(cookie)
   → clearCookie('refresh_token')
   → Zustand: logout() → очищаем user + token
```

---

## Database schema (ключевые модели)

```
User
  ├── id, email (unique), passwordHash, name, avatarUrl
  ├── role: USER | PROVIDER | ADMIN
  ├── preferredLocale: 'en' | 'ru'
  └── Sessions[], Bookings[], Reviews[], Favorites[]

Session
  ├── id, userId, refreshToken (SHA256, unique)
  ├── ip, userAgent
  └── expiresAt (30 дней от создания)

Provider
  ├── id, userId (1:1 с User)
  ├── name, nameI18n, bio, bioI18n
  └── isVerified, Listings[]

Listing
  ├── id, providerId, categoryId, cityId, countryId
  ├── title, titleI18n, description, descriptionI18n
  ├── priceMin, currency, listingType (rent|buy|service)
  ├── lat, lng, address
  ├── isPublished, isFeatured, deletedAt
  ├── rating, reviewCount (денормализовано, обновляется при Review)
  ├── searchVector (GENERATED, tsvector EN+RU)
  └── Media[], Bookings[], Reviews[], Favorites[]

Booking
  ├── id, listingId, userId
  ├── checkIn, checkOut, totalPrice, currency
  └── status: PENDING | CONFIRMED | CANCELLED | COMPLETED

Review
  ├── id, listingId, userId
  ├── rating (1-5), comment
  └── (уникально: один пользователь — один отзыв на листинг)
```

---

## Модули API

| Модуль | Путь | Ключевые операции |
|--------|------|-------------------|
| Auth | `/api/auth` | register, login, refresh, logout, me |
| Users | `/api/users` | GET/PATCH/DELETE /me |
| Providers | `/api/providers` | CRUD, listings by provider, reviews |
| Listings | `/api/listings` | list (фильтры+поиск), CRUD, approve/reject, geo |
| Bookings | `/api/bookings` | create, list, patch status |
| Reviews | `/api/reviews` | create, list (by listing), my reviews |
| Favorites | `/api/favorites` | toggle, list |
| Chat | `/api/chats`, WS | create chat, messages, typing, read receipts |
| Notifications | `/api/notifications` | list, mark read |
| Uploads | `/api/uploads/image` | presigned URL или прямая загрузка |
| Countries | `/api/countries` | list + cities by country slug |
| Cities | `/api/cities` | list, create |
| Categories | `/api/categories` | list (дерево) |
| Currency | `/api/currency/rates` | RUB/USD rate |
| Health | `/api/health` | статус сервиса |

---

## i18n архитектура

**API (nestjs-i18n):**
- Файлы: `apps/api/i18n/en/errors.json`, `apps/api/i18n/ru/errors.json`
- Locale определяется из `Accept-Language` header (выставляется в `api.ts` из NEXT_LOCALE cookie)
- В контроллерах: `(req as any).locale` → передаётся в service для переводов ошибок
- Валидационные сообщения: `i18nValidationMessage('errors.KEY')`
- Интерполяция constraints: `{constraints.0}` (не `{constraints[0]}`)

**Web (next-intl):**
- Локали в URL: `/en/...`, `/ru/...`
- Cookie `NEXT_LOCALE` — источник для API requests

---

## Поиск листингов

Полнотекстовый поиск через PostgreSQL `tsvector`:
- Колонка `searchVector` GENERATED ALWAYS — автообновляется при изменении title/description
- Индекс GIN на `searchVector`
- Два языка: `to_tsvector('english', ...)` + `to_tsvector('russian', ...)`
- Веса: title → 'A', description → 'B'

Гео-поиск:
- Функция `listings_within_radius(lat, lng, radius_km)` — Haversine формула
- `least(1.0, ...)` вокруг `acos()` защищает от domain error при floating point

**Важно:** `add_search_vector.sql` нужно применять вручную после `prisma db push/migrate` — Prisma не управляет этим SQL.

---

## WebSocket (Chat)

- Библиотека: Socket.IO через `@nestjs/websockets`
- Gateway: `ChatGateway`
- События: `chat:join`, `chat:leave`, `message:send`, `message:read`, `typing:start`, `typing:stop`
- Аутентификация: JWT Bearer в handshake headers

---

## File uploads

- Локально/staging: MinIO (S3-совместимый)
- Продакшен: Cloudflare R2
- Загрузка: presigned URL или через `/api/uploads/image`
- Файлы в `uploads/` директории на сервере (для staging без S3)

---

## Bull queues (async jobs)

- Email отправка (Resend API)
- Уведомления
- Очереди в Redis, worker в API процессе
