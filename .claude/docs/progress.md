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

### Известные технические долги
- Migration history не синхронизирована с реальной схемой (использовали `db push`)
  - Перед серьёзным продом нужно создать чистую `prisma migrate dev --name init` от текущей схемы
- `seed-geo.ts` в `apps/api/prisma/` — не ясно что делает, нужно изучить
- MinIO console открыт на порту 9001 без аутентификации на staging — закрыть перед публичным staging
