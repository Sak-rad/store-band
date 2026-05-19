# Database

Last updated: **2026-05-19**

---

## Подключение

| Окружение | URL |
|-----------|-----|
| Локальная разработка | `postgresql://postgres:postgres@localhost:5433/relocation_platform` |
| Docker внутри compose | `postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/relocation_platform` |
| Production (Railway) | Из `DATABASE_URL` env var (Railway Postgres plugin) |

**Порт 5433 в локальной разработке** — на 5432 висит системный Postgres.app. Это только локально, в докер-сети всё на 5432.

---

## Миграции — важно

**Текущая ситуация:** схема применена через `prisma db push`, не через `prisma migrate`.
Файл `20260401055051_init/migration.sql` устарел и не отражает текущую схему.

**Перед production** нужно:
```bash
# Сбросить историю миграций и создать актуальную
cd apps/api
npx prisma migrate dev --name init_clean
# Закоммитить новый migration файл
```

**После каждого `prisma db push` или `prisma migrate`** нужно вручную применить:
```bash
psql $DATABASE_URL -f prisma/migrations/add_search_vector.sql
```
Prisma не управляет raw SQL функциями и GENERATED колонками через tsvector.

---

## Ключевые решения по схеме

### ID типы
Все модели используют `Int @id @default(autoincrement())` кроме:
- `Session.id` — тоже Int
- Проверь `schema.prisma` если сомнения — был рефактор с String на Int

### Мягкое удаление (soft delete)
- `Listing.deletedAt DateTime?` — вместо DELETE
- Все запросы к листингам должны фильтровать `deletedAt: null`

### Денормализация рейтинга
- `Listing.rating Float` и `Listing.reviewCount Int` — хранятся на листинге
- Обновляются при каждом создании/удалении Review через агрегацию
- Это намеренно — не пересчитывать при каждом GET /listings

### i18n поля
- `nameI18n Json`, `descriptionI18n Json`, `titleI18n Json` — формат `{ "en": "...", "ru": "..." }`
- Рядом есть `name String`, `title String` — дефолтное значение для поиска и legacy

### Full-text search колонка
```sql
"searchVector" tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
  setweight(to_tsvector('russian', coalesce(description, '')), 'B')
) STORED
```
Prisma не поддерживает GENERATED tsvector — поэтому в отдельном SQL файле.

---

## Индексы

Из `add_search_vector.sql`:
```sql
CREATE INDEX IF NOT EXISTS listing_search_idx ON "Listing" USING GIN ("searchVector");
```

Из схемы (prisma создаёт автоматически):
- `Listing`: countryId, cityId+categoryId, isPublished+deletedAt, isFeatured, providerId
- `Session`: refreshToken (UNIQUE), userId
- `User`: email (UNIQUE)
- `Country`: code (UNIQUE), slug (UNIQUE)

---

## Полезные запросы

```sql
-- Все активные сессии пользователя
SELECT s.id, s.ip, s."userAgent", s."expiresAt"
FROM "Session" s
JOIN "User" u ON s."userId" = u.id
WHERE u.email = 'email@example.com';

-- Топ листингов по рейтингу
SELECT id, title, rating, "reviewCount"
FROM "Listing"
WHERE "isPublished" = true AND "deletedAt" IS NULL
ORDER BY rating DESC, "reviewCount" DESC
LIMIT 10;

-- Поиск по тексту
SELECT id, title, ts_rank("searchVector", query) AS rank
FROM "Listing", plainto_tsquery('russian', 'квартира Дубай') query
WHERE "searchVector" @@ query AND "isPublished" = true AND "deletedAt" IS NULL
ORDER BY rank DESC;

-- Очистить все сессии (например после смены JWT секрета)
DELETE FROM "Session";
```

---

## Бэкапы

**Локально (ручной):**
```bash
docker exec store-band-postgres-1 pg_dump -U postgres relocation_platform > backup_$(date +%Y%m%d).sql
```

**Production (Railway):**
Railway Postgres plugin делает автоматические бэкапы. Проверить в Railway dashboard → Database → Backups.

**Восстановление:**
```bash
psql $DATABASE_URL < backup_20260519.sql
```
