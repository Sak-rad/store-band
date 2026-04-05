#!/bin/sh
set -e

echo "▶ Running database migrations..."
cd /app
./node_modules/.bin/prisma migrate deploy --schema=./apps/api/prisma/schema.prisma

echo "▶ Starting API server..."
exec node apps/api/dist/main
