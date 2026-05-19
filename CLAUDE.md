# CLAUDE.md — Project Context for AI-Assisted Development

> This file is read automatically by Claude Code at session start.
> Full documentation: `.claude/docs/`

---

## What is this project

**Relocation Platform** — marketplace for expats relocating to Southeast Asia and UAE.
Users browse listings (apartments, villas, services), book, chat with providers, leave reviews.
Two locales: **en** and **ru**. Two roles: `USER` and `PROVIDER`.

Owner/contact: **Alex** (agribenchenko@gmail.com)

---

## Tech stack

| Layer | Tech |
|-------|------|
| API | NestJS 10, Prisma 5, PostgreSQL 16, Redis 7, Bull queues |
| Web | Next.js 14 (App Router), Zustand, React Query, Axios |
| Auth | JWT (15m access) + refresh token rotation (30d, httpOnly cookie) |
| Storage | MinIO (local/staging) / Cloudflare R2 (production) |
| Infra | Docker Compose, Railway (target prod), Nginx |
| i18n | nestjs-i18n (API) + next-intl (Web) |

Monorepo: `pnpm` workspaces + Turborepo.
- API: `apps/api/` — port 3001
- Web: `apps/web/` — port 3000

---

## Current state (updated 2026-05-19)

### Done
- [x] Auth: register, login, logout, JWT refresh rotation, SHA-256 hashed refresh tokens in DB
- [x] Listings: CRUD, filtering, full-text search (EN+RU), geo search, featured/published flags
- [x] Bookings, Reviews, Favorites, Chat (WebSocket), Notifications
- [x] File uploads (S3-compatible), Currency rates, Countries/Cities/Categories
- [x] Seed data: 17 listings, 8 countries, 11 cities, 7 reviewer users
- [x] Docker Compose: dev (`docker-compose.dev.yml`) + staging (`docker-compose.staging.yml`)
- [x] Security audit completed — see `.claude/docs/security.md`

### In progress / Next
- [ ] Production deploy to Railway + domain + SSL — see `.claude/docs/deploy.md`
- [ ] GitHub Actions CI/CD pipeline
- [ ] Admin panel for listing moderation

---

## Critical rules — read before touching auth or DB

1. **Refresh tokens** are stored as `SHA-256(token)` in DB. Plain token only in httpOnly cookie.
2. **Argon2id** with `memoryCost: 19456, timeCost: 2, parallelism: 1` — tuned for Railway free tier.
3. **MaxLength(128)** on all password fields — prevents Argon2 DoS.
4. **trust proxy = 1** is set in `main.ts` — required for correct IP behind Railway/Nginx.
5. Refresh endpoint excluded from 401 interceptor in `api.ts` — prevents deadlock.
6. Local dev postgres runs on port **5433** (5432 is taken by local Postgres.app).

---

## Key file locations

```
apps/api/src/modules/auth/          — auth controller, service, strategies, DTOs
apps/api/src/modules/users/         — user profile CRUD
apps/api/src/common/guards/         — JwtAuthGuard, RolesGuard
apps/api/prisma/schema.prisma       — DB schema (source of truth)
apps/api/prisma/seed.ts             — mock data (17 listings)
apps/api/prisma/migrations/         — SQL migrations + add_search_vector.sql (apply manually after push)
apps/api/.env                       — local dev env (not in git)
apps/web/src/shared/lib/api.ts      — Axios instance + 401 interceptor + refresh queue
apps/web/src/shared/store/auth.store.ts — Zustand auth store (token in memory only)
apps/web/src/shared/ui/Providers.tsx — session restore on page reload
.claude/docs/                       — detailed documentation (see below)
```

---

## Detailed docs index

| File | Contents |
|------|----------|
| `.claude/docs/architecture.md` | System design, data flow diagrams, module map |
| `.claude/docs/security.md` | Security audit log, decisions, known risks |
| `.claude/docs/deploy.md` | Deploy state, Railway setup, env vars, checklist |
| `.claude/docs/database.md` | Schema decisions, indexes, migration notes |
| `.claude/docs/progress.md` | Chronological changelog of all significant changes |
| `.claude/docs/api-contracts.md` | All API endpoints with request/response shapes |

---

## Local dev quick start

```bash
# 1. Start infra (postgres on 5433, redis on 6379)
docker compose -f docker-compose.dev.yml up -d postgres redis

# 2. Apply schema + search vector
cd apps/api
npx prisma db push
psql "postgresql://postgres:postgres@127.0.0.1:5433/relocation_platform" \
  -f prisma/migrations/add_search_vector.sql

# 3. Seed data
pnpm prisma:seed

# 4. Start API (watch mode)
pnpm dev   # from apps/api/

# 5. Start Web (separate terminal)
pnpm dev   # from apps/web/
```

Provider login: `provider@relocate.dev` / `Admin1234!`
