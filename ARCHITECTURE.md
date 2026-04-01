# Relocation Platform — Architecture

## System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                        Cloudflare CDN                        │
└─────────────────────────┬────────────────────────────────────┘
                          │
                    ┌─────▼──────┐
                    │   Nginx    │  80/443
                    │ (reverse   │
                    │  proxy)    │
                    └──┬──────┬──┘
                       │      │
          ┌────────────▼─┐  ┌─▼────────────┐
          │  Next.js 15  │  │  NestJS API  │
          │  (web :3000) │  │  (:3001)     │
          │              │  │              │
          │  next-intl   │  │ nestjs-i18n  │
          │  EN/RU       │  │ EN/RU        │
          └──────────────┘  └──┬───────┬───┘
                               │       │
                    ┌──────────▼─┐  ┌──▼──────────┐
                    │ PostgreSQL │  │   Redis 7   │
                    │   :5432    │  │   :6379     │
                    │            │  │             │
                    │ - Users    │  │ - Cache     │
                    │ - Listings │  │ - Sessions  │
                    │ - Bookings │  │ - BullMQ    │
                    │ - Reviews  │  │ - Presence  │
                    │ - Chats    │  └─────────────┘
                    └────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   S3 / R2 Storage   │
                    │   (images, files)   │
                    └─────────────────────┘
```

## Locale Flow

```
Browser Accept-Language: ru
       │
  Nginx proxy_pass → NestJS
       │
  LocaleInterceptor
  1. ?lang=ru  query param
  2. Accept-Language header
  3. user.preferredLocale (DB)
  4. fallback: 'en'
       │
  req.locale = 'ru'
       │
  ListingsService.resolveLocale(item, 'ru')
  → title = item.titleI18n['ru']
       │
  API response: { title: "Уютная квартира" }
```

## Monorepo Structure

```
relocation-platform/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Full DB schema with i18n Json fields
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # JWT, sessions, argon2
│   │   │   │   ├── users/      # Profile, preferredLocale
│   │   │   │   ├── listings/   # Search (bilingual tsvector) + i18n resolver
│   │   │   │   ├── bookings/   # Date conflict detection + i18n errors
│   │   │   │   ├── chat/       # Socket.IO gateway + service
│   │   │   │   ├── reviews/    # Rating aggregation
│   │   │   │   ├── favorites/
│   │   │   │   ├── notifications/ # BullMQ + email templates EN/RU
│   │   │   │   ├── uploads/    # S3 presigned URLs + sharp
│   │   │   │   ├── providers/
│   │   │   │   ├── countries/
│   │   │   │   ├── cities/
│   │   │   │   ├── categories/
│   │   │   │   └── health/
│   │   │   ├── common/
│   │   │   │   ├── interceptors/locale.interceptor.ts
│   │   │   │   ├── guards/     # jwt-auth, roles
│   │   │   │   ├── decorators/ # @Public, @Roles, @CurrentUser
│   │   │   │   └── helpers/    # resolveI18n, resolveModel
│   │   │   └── prisma/         # Global PrismaService
│   │   └── i18n/
│   │       ├── en/             # errors.json, notifications.json, emails.json
│   │       └── ru/             # same keys, Russian text
│   │
│   └── web/                    # Next.js 15 frontend
│       ├── messages/
│       │   ├── en.json         # ALL keys — no placeholders
│       │   └── ru.json         # ALL keys — no placeholders
│       └── src/
│           ├── app/[locale]/   # Locale-prefix routing
│           ├── features/       # FSD feature slices
│           │   ├── auth/
│           │   ├── listing-search/
│           │   ├── listing-detail/
│           │   ├── create-booking/
│           │   ├── chat/
│           │   ├── bookings/
│           │   └── language-switcher/
│           ├── entities/listing/
│           ├── shared/lib/     # api.ts, query-client.ts
│           └── shared/store/   # Zustand auth store
│
├── styles/                     # Global SCSS (shared)
│   ├── _variables.scss
│   ├── _mixins.scss
│   ├── _breakpoints.scss
│   ├── _reset.scss
│   └── globals.scss
│
├── nginx/nginx.conf
├── docker-compose.yml
├── .github/workflows/deploy.yml
├── .env.example
├── package.json                # pnpm workspaces root
├── pnpm-workspace.yaml
└── turbo.json
```

## Key Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| i18n DB strategy | JSON column (`titleI18n`, `nameI18n`) | No join overhead; simple resolver |
| Full-text search | PostgreSQL tsvector (EN + RU combined) | Native, no external service needed |
| Frontend i18n | next-intl with `[locale]` prefix routing | Best Next.js 15 App Router support |
| Backend i18n | nestjs-i18n | Integrates with class-validator error messages |
| Auth | JWT (15m) + httpOnly refresh token (30d) | Secure; no localStorage tokens |
| Real-time | Socket.IO NestJS Gateway | Works with existing NestJS ecosystem |
| Queue | BullMQ + Redis | Reliable job processing; retries |
| File upload | S3 presigned PUT URLs | Client uploads directly; no API bandwidth |
| Image processing | sharp (WebP, multi-size) | WebP saves 30-50% vs JPEG |

## Getting Started

```bash
# 1. Install
pnpm install

# 2. Copy env
cp .env.example .env
# Edit .env with your values

# 3. Start infra
docker compose up postgres redis minio -d

# 4. Run migrations + seed
pnpm db:migrate
pnpm db:seed

# 5. Add bilingual full-text search
psql $DATABASE_URL < apps/api/prisma/migrations/add_search_vector.sql

# 6. Start dev
pnpm dev
```
