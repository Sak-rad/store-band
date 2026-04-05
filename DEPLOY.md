# Деплой на тестовый стенд (Staging)

## Требования к серверу

- VPS / любая машина с Ubuntu 20.04+ (или другой Linux)
- Минимум **2 GB RAM**, 20 GB диск
- Открытые порты: **80** (web), **9001** (MinIO console)
- Установлен Docker + Docker Compose

---

## Шаг 1 — Установка Docker на сервере

```bash
# Подключись к серверу
ssh user@YOUR_SERVER_IP

# Установи Docker одной командой
curl -fsSL https://get.docker.com | sh

# Добавь текущего пользователя в группу docker (чтобы не нужен sudo)
sudo usermod -aG docker $USER
newgrp docker

# Проверь
docker --version
docker compose version
```

---

## Шаг 2 — Скопируй код на сервер

**Вариант A — через Git (рекомендуется):**
```bash
git clone https://github.com/YOUR_ORG/YOUR_REPO.git /opt/store-band
cd /opt/store-band
```

**Вариант B — через rsync со своей машины:**
```bash
# Запусти на своей машине (Mac/Windows WSL):
rsync -avz --exclude 'node_modules' --exclude '.next' \
  /Users/alex/Desktop/store-band/ \
  user@YOUR_SERVER_IP:/opt/store-band/
```

---

## Шаг 3 — Создай .env.staging

```bash
cd /opt/store-band

cp .env.staging.example .env.staging
nano .env.staging   # или vim, или любой редактор
```

Заполни все значения:

```env
SERVER_HOST=192.168.1.100      # IP твоего сервера (или домен без https://)

POSTGRES_PASSWORD=MyStr0ngPass123

# Генерируй случайные секреты:
# openssl rand -hex 32
JWT_ACCESS_SECRET=abc123...    # 64 символа
JWT_REFRESH_SECRET=def456...   # 64 символа

MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=MinioPass123
```

> **Генерация секретов:**
> ```bash
> openssl rand -hex 32   # скопируй результат в JWT_ACCESS_SECRET
> openssl rand -hex 32   # скопируй результат в JWT_REFRESH_SECRET
> ```

---

## Шаг 4 — Запусти деплой

```bash
cd /opt/store-band
bash scripts/deploy-staging.sh
```

Скрипт автоматически:
1. Проверит зависимости
2. Соберёт Docker-образы (~5–10 мин при первом запуске)
3. Запустит PostgreSQL, Redis, MinIO
4. Выполнит миграции базы данных
5. Спросит, заливать ли тестовые данные (seed)
6. Запустит web и nginx

---

## После деплоя

| Сервис | URL |
|--------|-----|
| 🌐 Сайт | `http://YOUR_SERVER_IP` |
| 🔌 API | `http://YOUR_SERVER_IP/api` |
| 📦 MinIO Console | `http://YOUR_SERVER_IP:9001` |

---

## Полезные команды

```bash
# Посмотреть все логи в реальном времени
docker compose -f docker-compose.staging.yml logs -f

# Логи только одного сервиса
docker compose -f docker-compose.staging.yml logs -f api
docker compose -f docker-compose.staging.yml logs -f web

# Статус контейнеров
docker compose -f docker-compose.staging.yml ps

# Войти в контейнер API
docker compose -f docker-compose.staging.yml exec api sh

# Перезапустить один сервис
docker compose -f docker-compose.staging.yml restart api

# Остановить всё (данные сохраняются)
docker compose -f docker-compose.staging.yml down

# Остановить и удалить все данные (полный сброс!)
docker compose -f docker-compose.staging.yml down -v
```

---

## Загрузка тестовых данных вручную

Если seed не запустился автоматически:

```bash
# Войди в контейнер
docker compose -f docker-compose.staging.yml exec api sh

# Внутри контейнера:
cd /app

# Сначала гео-данные (страны, города)
./node_modules/.bin/ts-node -r tsconfig-paths/register apps/api/prisma/seed-geo.ts

# Затем основные данные (листинги, провайдеры, отзывы)
./node_modules/.bin/ts-node -r tsconfig-paths/register apps/api/prisma/seed.ts
```

---

## Обновление (после изменений в коде)

```bash
cd /opt/store-band

# Обнови код (если используешь Git)
git pull

# Пересобери и перезапусти изменённые сервисы
docker compose -f docker-compose.staging.yml --env-file .env.staging build api web
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d api web nginx
```

> **Важно:** если изменились `NEXT_PUBLIC_*` переменные или код фронтенда —
> обязательно пересобирай образ `web` (они bake-ятся в сборку, не в runtime).

---

## Решение проблем

### Сайт не открывается
```bash
# Проверь статус
docker compose -f docker-compose.staging.yml ps

# Проверь nginx
docker compose -f docker-compose.staging.yml logs nginx

# Проверь порт 80 открыт
curl -I http://localhost
```

### API возвращает ошибки
```bash
docker compose -f docker-compose.staging.yml logs api --tail=50
```

### База данных: ошибка подключения
```bash
docker compose -f docker-compose.staging.yml logs postgres
docker compose -f docker-compose.staging.yml exec postgres psql -U postgres -c "\l"
```

### Полный сброс и чистый деплой
```bash
docker compose -f docker-compose.staging.yml down -v   # удалить все данные
bash scripts/deploy-staging.sh                          # задеплоить заново
```

---

## Структура созданных файлов

```
docker-compose.staging.yml      — конфигурация staging-окружения
nginx/nginx.staging.conf        — nginx (HTTP, без SSL)
apps/api/Dockerfile.staging     — образ API с Prisma CLI
apps/api/docker-entrypoint.sh   — запуск миграций перед стартом
apps/web/Dockerfile.staging     — образ Web с bake-нутыми env vars
.env.staging.example            — шаблон переменных окружения
scripts/deploy-staging.sh       — скрипт автоматического деплоя
```
