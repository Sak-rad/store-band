#!/bin/sh
# Создаёт бакет в MinIO при первом запуске
# Запускается автоматически из docker-compose

set -e

echo "⏳ Waiting for MinIO..."
until curl -sf http://minio:9000/minio/health/live; do
  sleep 2
done

echo "🪣 Creating bucket..."
mc alias set local http://minio:9000 minio minio123
mc mb --ignore-existing local/relocation-platform
mc anonymous set download local/relocation-platform

echo "✅ MinIO ready: bucket 'relocation-platform' created"
