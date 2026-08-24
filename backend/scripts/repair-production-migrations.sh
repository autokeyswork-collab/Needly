#!/usr/bin/env sh
set -eu

MIGRATION_NAME="20260824114500_add_promotion_homepage_banner_fields"
REPAIR_SQL="prisma/repairs/${MIGRATION_NAME}.sql"
PRISMA="./node_modules/.bin/prisma"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is not set; skipping production migration repair."
  exit 0
fi

if [ ! -x "$PRISMA" ]; then
  echo "Prisma CLI not installed yet; skipping production migration repair."
  exit 0
fi

if [ ! -f "$REPAIR_SQL" ]; then
  echo "Repair SQL not found: $REPAIR_SQL"
  exit 1
fi

echo "Ensuring promotion banner columns exist before Prisma migrate deploy..."
"$PRISMA" db execute --schema prisma/schema.prisma --file "$REPAIR_SQL"

echo "Marking ${MIGRATION_NAME} as applied if it was previously failed..."
"$PRISMA" migrate resolve --schema prisma/schema.prisma --applied "$MIGRATION_NAME" \
  || echo "${MIGRATION_NAME} was not in a failed state; continuing."
