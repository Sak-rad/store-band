#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy-staging.sh — разворачивает staging-окружение одной командой
# Запуск: bash scripts/deploy-staging.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Цвета ────────────────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'
B='\033[0;34m'; C='\033[0;36m'; W='\033[1;37m'; N='\033[0m'

log()    { echo -e "${B}▶${N}  $1"; }
ok()     { echo -e "${G}✓${N}  $1"; }
warn()   { echo -e "${Y}⚠${N}   $1"; }
err()    { echo -e "${R}✗${N}  $1" >&2; exit 1; }
section(){ echo -e "\n${W}── $1 ──────────────────────────────────────────────${N}"; }

COMPOSE_FILE="docker-compose.staging.yml"
ENV_FILE=".env.staging"
DC="docker compose -f $COMPOSE_FILE --env-file $ENV_FILE"

echo -e "${W}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║       Staging Deployment Script          ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${N}"

# ── 1. Проверка зависимостей ──────────────────────────────────────────────────
section "Проверка зависимостей"

command -v docker >/dev/null 2>&1 \
  || err "Docker не установлен. Инструкция: https://docs.docker.com/get-docker/"

docker compose version >/dev/null 2>&1 \
  || err "Docker Compose не найден. Убедитесь что установлен Docker Desktop или Compose plugin."

[[ -f "$ENV_FILE" ]] \
  || err "Файл $ENV_FILE не найден.\nСкопируй: cp .env.staging.example .env.staging\nЗатем заполни значения и запусти снова."

ok "Docker и Docker Compose найдены"

# ── 2. Загрузка и валидация .env.staging ─────────────────────────────────────
section "Загрузка конфигурации"

set -a; source "$ENV_FILE"; set +a

[[ -n "${SERVER_HOST:-}"        ]] || err "SERVER_HOST не задан в $ENV_FILE"
[[ "${SERVER_HOST}" != "YOUR_SERVER_IP" ]] || err "Замени YOUR_SERVER_IP на реальный IP сервера в $ENV_FILE"
[[ -n "${POSTGRES_PASSWORD:-}"  ]] || err "POSTGRES_PASSWORD не задан в $ENV_FILE"
[[ -n "${JWT_ACCESS_SECRET:-}"  ]] || err "JWT_ACCESS_SECRET не задан в $ENV_FILE"
[[ -n "${JWT_REFRESH_SECRET:-}" ]] || err "JWT_REFRESH_SECRET не задан в $ENV_FILE"
[[ -n "${MINIO_ROOT_PASSWORD:-}"] || err "MINIO_ROOT_PASSWORD не задан в $ENV_FILE"

ok "Конфигурация загружена → деплой на: ${C}${SERVER_HOST}${N}"

# ── 3. Сборка образов ─────────────────────────────────────────────────────────
section "Сборка Docker-образов"
log "Первая сборка занимает ~5-10 минут..."

$DC build
ok "Все образы собраны"

# ── 4. Запуск инфраструктуры ──────────────────────────────────────────────────
section "Запуск инфраструктуры"

log "Запускаем PostgreSQL, Redis, MinIO..."
$DC up -d postgres redis minio

log "Ожидаем готовности PostgreSQL..."
RETRIES=0
until $DC exec postgres pg_isready -U postgres -q 2>/dev/null; do
  sleep 2; RETRIES=$((RETRIES+1))
  [[ $RETRIES -lt 30 ]] || err "PostgreSQL не поднялся за 60 секунд. Проверь логи: $DC logs postgres"
  echo -n "."
done
echo ""
ok "PostgreSQL готов"

log "Инициализируем MinIO bucket..."
$DC up -d minio-init
sleep 12
ok "MinIO готов"

# ── 5. Запуск API (миграции выполняются автоматически) ────────────────────────
section "Запуск API"

log "Запускаем API (автоматически выполнит миграции Prisma)..."
$DC up -d api

log "Ожидаем запуска API (до 60 секунд)..."
RETRIES=0
until $DC exec api wget -qO- http://localhost:3001/api/health >/dev/null 2>&1; do
  sleep 3; RETRIES=$((RETRIES+1))
  [[ $RETRIES -lt 20 ]] || { warn "API не ответил на /health, продолжаем..."; break; }
  echo -n "."
done
echo ""
ok "API запущен"

# ── 6. Тестовые данные (seed) ─────────────────────────────────────────────────
section "Тестовые данные"

echo -e "${Y}Залить тестовые данные в базу?${N}"
echo "  (Создаст объявления, провайдеров, отзывы для тестирования)"
read -rp "Загрузить seed? [y/N]: " SEED_ANSWER

if [[ "${SEED_ANSWER,,}" == "y" ]]; then
  log "Запускаем seed-geo (страны и города)..."
  $DC exec api sh -c "cd /app && ./node_modules/.bin/ts-node -r tsconfig-paths/register apps/api/prisma/seed-geo.ts 2>/dev/null || ./node_modules/.bin/prisma db seed" \
    && ok "Geo-данные загружены" \
    || warn "Geo seed не удался — попробуй вручную (см. DEPLOY.md)"

  log "Запускаем основной seed (листинги, пользователи, отзывы)..."
  $DC exec api sh -c "cd /app && ./node_modules/.bin/ts-node -r tsconfig-paths/register apps/api/prisma/seed.ts 2>/dev/null" \
    && ok "Тестовые данные загружены" \
    || warn "Seed не удался — запусти вручную после деплоя (см. DEPLOY.md)"
else
  log "Пропускаем seed"
fi

# ── 7. Запуск Web и Nginx ─────────────────────────────────────────────────────
section "Запуск Web и Nginx"

$DC up -d web nginx
ok "Web и Nginx запущены"

# ── Итог ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${G}╔══════════════════════════════════════════════════════╗${N}"
echo -e "${G}║   ✅  Staging успешно развёрнут!                    ║${N}"
echo -e "${G}╚══════════════════════════════════════════════════════╝${N}"
echo ""
echo -e "  🌐  Сайт:            ${C}http://${SERVER_HOST}${N}"
echo -e "  🔌  API:             ${C}http://${SERVER_HOST}/api${N}"
echo -e "  📦  MinIO Console:   ${C}http://${SERVER_HOST}:9001${N}"
echo -e "       MinIO user:     ${MINIO_ROOT_USER:-minio}"
echo -e "       MinIO password: (из .env.staging)"
echo ""
echo -e "  ${W}Полезные команды:${N}"
echo -e "  Логи:       ${B}$DC logs -f${N}"
echo -e "  Логи API:   ${B}$DC logs -f api${N}"
echo -e "  Остановить: ${B}$DC down${N}"
echo -e "  Перезапуск: ${B}$DC restart api${N}"
echo -e "  Shell в API:${B}$DC exec api sh${N}"
echo ""
echo -e "  Подробнее: ${B}cat DEPLOY.md${N}"
echo ""
