#!/bin/sh
# wait-for-postgres.sh — lightweight readiness check for Postgres in Alpine containers

set -e

host="$1"
shift
cmd="$@"

until PGPASSWORD="$POSTGRES_PASSWORD" pg_isready -h "$host" -U "${POSTGRES_USER:-signflow}" -d "${POSTGRES_DB:-signflow}"; do
  echo "⏳ Waiting for PostgreSQL at $host..."
  sleep 1
done

echo "✅ PostgreSQL is ready — starting app"
exec $cmd
