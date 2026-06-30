# syntax=docker/dockerfile:1

# ---- Builder: install deps (incl. native better-sqlite3) and build the app ----
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Toolchain for compiling better-sqlite3 if no prebuilt binary is available.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Install dependencies first (better layer caching). Prisma's postinstall runs
# `prisma generate`, so the schema + config must be present.
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# Build (runs `prisma generate && next build`). A dummy DATABASE_URL satisfies
# config loading; no DB connection happens during the build.
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="file:/data/app.db"
RUN npm run build

# ---- Runner: minimal-ish runtime image (no build toolchain) ----
FROM node:24-bookworm-slim AS runner
WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# better-sqlite3 is already compiled in node_modules — copy it as-is (no rebuild).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && mkdir -p /data/uploads

EXPOSE 3000
# Persisted data: SQLite DB + uploaded audio.
VOLUME ["/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
