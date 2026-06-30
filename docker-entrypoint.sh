#!/bin/sh
set -e

# Ensure the data dirs exist on a fresh volume.
mkdir -p /data/uploads

# Apply database migrations (creates app.db on first run).
echo "Running database migrations…"
./node_modules/.bin/prisma migrate deploy

# Start the Next.js server.
echo "Starting Voxtral on port ${PORT:-3000}…"
exec ./node_modules/.bin/next start -p "${PORT:-3000}" -H "${HOSTNAME:-0.0.0.0}"
