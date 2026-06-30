# Voxtral Transcription Web App

Self-hostable web app to transcribe audio with **Mistral Voxtral**: log in, save your Mistral API
key once, upload audio, and get a speaker-labelled, timestamped transcript you can read inline,
keep in a per-user history, and download as `.txt` or `.json`.

- **Stack:** Next.js 16 (App Router, TypeScript) · SQLite + Prisma 7 · Auth.js v5 (Credentials) ·
  Tailwind v4 + shadcn/ui · AES-256-GCM for the API key at rest.
- **Runs with one command:** `docker compose up`. Data persists in a Docker volume.

---

## Features

- Email + password auth (bcrypt-hashed, persistent sessions, protected routes).
- Per-user Mistral API key, **encrypted at rest** and never returned to the browser (shown masked).
- Drag-and-drop upload (`.mp3 .m4a .wav .ogg .flac .webm`, ≤ 100 MB), language selector (13 + auto),
  diarization toggle (default on).
- Speaker-labelled transcript inline (`[mm:ss] Speaker N: text`), colour-coded per speaker.
- History (newest first, paginated) and a per-item result page.
- Download each transcript as formatted `.txt` or raw `.json`.
- Light / dark mode.

---

## Quick start (Docker — recommended)

Requires Docker + Docker Compose.

```bash
# 1. Configure environment
cp .env.example .env
npm run gen-keys      # prints APP_ENCRYPTION_KEY and AUTH_SECRET — paste them into .env
#   (no Node? generate manually: openssl rand -base64 32  — once per secret)

# 2. Build and run
docker compose up --build -d

# 3. Open the app
#   http://localhost:3000
```

The container runs database migrations automatically on start and serves on port 3000.
The SQLite database and uploaded audio are stored in the `voxtral-data` volume (mounted at `/data`).

### Create your account and add your key

1. Go to `http://localhost:3000/register` and create your account (email + password).
2. Go to **Settings**, paste your Mistral API key (from
   [console.mistral.ai](https://console.mistral.ai/api-keys)), and save. It is encrypted immediately.
3. Go to **Dashboard**, upload audio, and transcribe.

### Lock down registration (single-operator mode)

After creating your account, set `ALLOW_REGISTRATION="false"` in `.env` and restart
(`docker compose up -d`). The `/register` page and API are then disabled.

---

## Local development

Requires **Node.js ≥ 24** and npm.

```bash
npm install
cp .env.example .env
npm run gen-keys            # paste the two secrets into .env
npx prisma migrate dev      # creates ./data/app.db
npm run dev                 # http://localhost:3000
```

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma generate` + production build (type-checks) |
| `npm run start` | Start the production server (after build) |
| `npm run gen-keys` | Print fresh `APP_ENCRYPTION_KEY` + `AUTH_SECRET` |
| `npm run prisma:migrate` | Apply migrations (`prisma migrate deploy`) |

---

## Environment variables

See `.env.example`. Summary:

| Var | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file. Local: `file:./data/app.db`. Docker: `file:/data/app.db` (set in compose). |
| `APP_ENCRYPTION_KEY` | base64 32-byte key for AES-256-GCM (encrypts the API key). **Required.** |
| `AUTH_SECRET` | Auth.js session-signing secret. **Required.** |
| `NEXTAUTH_URL` | App base URL (e.g. `http://localhost:3000`). |
| `UPLOAD_DIR` | Audio storage dir. Local: `./data/uploads`. Docker: `/data/uploads`. |
| `ALLOW_REGISTRATION` | `"true"` allows signup; `"false"` = single-operator mode. |

> Generate the two secrets with `npm run gen-keys` (or `openssl rand -base64 32` each).
> Keep `.env` private — it is gitignored.

---

## The Mistral Voxtral API (exact integration)

Used **server-side only** (`src/lib/voxtral.ts`). Verified against the live API.

- **Endpoint:** `POST https://api.mistral.ai/v1/audio/transcriptions`
- **Auth header:** `Authorization: Bearer <USER_API_KEY>`
- **Body:** `multipart/form-data`

| Field | Value | Notes |
|---|---|---|
| `file` | the audio file | binary |
| `model` | `voxtral-mini-latest` | transcription model |
| `diarize` | `true` (or omit) | speaker labels |
| `timestamp_granularities` | `segment` | **REQUIRED when `diarize=true`** — the API returns HTTP 422 without it |
| `language` | e.g. `de`, `en`, `fr` | optional; omit for auto-detect |

> **Critical:** whenever diarization is on, the app always also sends
> `timestamp_granularities=segment`. Sending `diarize=true` without it returns:
> `422 — "When diarize is set to True and streaming is disabled, the timestamp granularity must be
> set to ['segment']"`.

**Rendering:** if `segments` is non-empty, each is shown as `[mm:ss] Speaker N: text`
(`speaker_1 → Speaker 1`, …); otherwise the flat `text` field is shown. Both the formatted text and
the raw JSON are stored (for the two download buttons).

**Supported languages:** English (en), French (fr), German (de), Spanish (es), Italian (it),
Portuguese (pt), Dutch (nl), Russian (ru), Chinese (zh), Japanese (ja), Korean (ko), Hindi (hi),
Arabic (ar), plus Auto-detect.

**Error handling:** `401/403` → "API key was rejected — check it in Settings"; `422`, `429`
(rate limit), and `5xx` are shown clearly and the transcription is stored with `status=error`.
The API key never appears in any client response, log, or error message.

---

## Backups

All persistent state lives under `/data` (the `voxtral-data` Docker volume). Back up:

- **`/data/app.db`** — the SQLite database (users, encrypted API keys, transcription history/text).
- **`/data/uploads/`** — the original uploaded audio files.

> Also keep your `.env` safe: without `APP_ENCRYPTION_KEY` you cannot decrypt stored API keys, and
> without `AUTH_SECRET` existing sessions are invalidated.

Example (copy the volume's data out of a running container):

```bash
docker compose exec app tar czf - /data > voxtral-backup-$(date +%F).tar.gz
```

---

## Project layout

```
src/
  app/                     # routes (auth pages, protected (app) group, API routes)
  components/              # UI: upload, transcript view, history, nav, settings, shadcn/ui
  lib/                     # db, crypto, api-key, voxtral, transcript, storage, validation
  auth.ts / auth.config.ts # Auth.js (Credentials + JWT)
  proxy.ts                 # route protection (Next 16 middleware)
prisma/schema.prisma       # User + Transcription models
Dockerfile / docker-compose.yml / docker-entrypoint.sh
```

---

## Scope

This is a personal/testing tool. Out of scope (by design): realtime/streaming transcription,
summarization/LLM features, billing/teams, and production GDPR hardening.
