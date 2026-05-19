# Deploy Documentation

Last updated: **2026-05-19**

---

## Target production infrastructure

| Сервис | Платформа | Примечания |
|--------|-----------|------------|
| API (NestJS) | Railway | Free tier → Hobby по мере роста |
| Web (Next.js) | Railway | Standalone output, Node.js runtime |
| PostgreSQL | Railway Plugin | Managed, автобэкапы |
| Redis | Railway Plugin | Managed |
| File storage | Cloudflare R2 | S3-совместимый, дешевле AWS |
| Nginx / SSL | Railway встроенный | Или Cloudflare proxy |

---

## Статус деплоя

- [ ] Railway аккаунт создан и привязан к репо
- [ ] Домен куплен и подключён
- [ ] SSL настроен
- [ ] Все production env vars выставлены
- [ ] Первый деплой выполнен
- [ ] Seed данные залиты
- [ ] Мониторинг настроен

---

## Railway — шаги к первому деплою

### 1. Подготовка репо
```bash
# Убедиться что .gitignore включает:
# .env, .env.*, apps/api/.env, apps/web/.env.local
# НЕ должны попасть в git секреты
```

### 2. Railway environment variables (все обязательные)

**Общие:**
```
NODE_ENV=production
```

**API сервис:**
```
DATABASE_URL=        # автоматически из Railway Postgres plugin
REDIS_URL=           # автоматически из Railway Redis plugin
JWT_ACCESS_SECRET=   # openssl rand -hex 64
JWT_REFRESH_SECRET=  # openssl rand -hex 64  (пока не используется, но должен быть)
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d
CLIENT_URL=https://your-domain.com
PORT=3001
DEFAULT_LOCALE=en
SUPPORTED_LOCALES=en,ru
THROTTLE_LIMIT=60

# Cloudflare R2:
S3_BUCKET=relocation-platform
S3_REGION=auto
S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_PUBLIC_URL=https://cdn.your-domain.com

# Email (Resend):
RESEND_API_KEY=
EMAIL_FROM=noreply@your-domain.com
```

**Web сервис (build args, не runtime):**
```
NEXT_PUBLIC_API_URL=https://your-domain.com/api
NEXT_PUBLIC_WS_URL=wss://your-domain.com
NEXT_PUBLIC_DEFAULT_LOCALE=en
```

### 3. После деплоя — обязательно вручную
```bash
# Зайти в Railway shell API сервиса и применить search vector:
psql $DATABASE_URL -f prisma/migrations/add_search_vector.sql

# Залить seed данные (один раз):
npx ts-node prisma/seed.ts
```

### 4. Проверить
```bash
curl https://your-domain.com/api/health   # {"status":"ok"}
curl https://your-domain.com/api/listings # список листингов
```

---

## Staging (локальный сервер / VPS)

Полная инструкция: `DEPLOY.md` в корне проекта.

```bash
# Быстрый старт:
cp .env.staging.example .env.staging
# Заполнить .env.staging
bash scripts/deploy-staging.sh
```

Staging использует HTTP (без SSL), MinIO вместо R2, nginx как реверс-прокси.

---

## Docker образы

| Образ | Dockerfile | Особенности |
|-------|-----------|-------------|
| API prod | `apps/api/Dockerfile` | Multi-stage, без Prisma CLI |
| API staging | `apps/api/Dockerfile.staging` | Включает Prisma CLI для миграций |
| Web prod | `apps/web/Dockerfile` | Next.js standalone, `NEXT_PUBLIC_*` как build args |
| Web staging | `apps/web/Dockerfile.staging` | То же, с `ALLOW_ANY_HTTP_HOST=true` |

**Важно:** `NEXT_PUBLIC_*` переменные запекаются в бандл на этапе билда, не runtime. При смене домена нужен rebuild образа.

---

## CI/CD (не настроен, план)

```yaml
# .github/workflows/deploy.yml — запланировано
# Триггер: push в main
# Шаги:
# 1. pnpm install
# 2. pnpm lint
# 3. pnpm build
# 4. Railway deploy (через railway CLI или GitHub Action)
```

---

## Переменные которые НЕЛЬЗЯ хардкодить

Никогда не коммитить:
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`
- `POSTGRES_PASSWORD`
- `S3_ACCESS_KEY`, `S3_SECRET_KEY`
- `RESEND_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `MINIO_ROOT_PASSWORD`

Эти переменные должны быть только в Railway dashboard или в `.env` файлах которые в `.gitignore`.
