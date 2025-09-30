#!/usr/bin/env bash
set -euo pipefail

echo "Using DIRECT_URL for schema engine operations..."

npx prisma generate --schema=prisma/schema.prisma

# Prefer migrate; fallback to db push for dev if migrate fails due to drift
if npx prisma migrate dev --schema=prisma/schema.prisma; then
  echo "Migrate success."
else
  echo "Migrate failed; attempting db push (dev only)..."
  npx prisma db push --schema=prisma/schema.prisma
fi

node scripts/dbHealth.js


