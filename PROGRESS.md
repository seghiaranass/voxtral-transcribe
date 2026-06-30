# Build Progress — Voxtral Transcription Web App

Session tracker. Updated after every phase so work is resumable. Plan file:
`C:\Users\Anass\.claude\plans\ticklish-giggling-tiger.md`. Spec: `voxtral-webapp-build-spec.md`.

## Stack as actually installed
- Next.js **16.2.9** (App Router, Turbopack) · React 19.2.4 · TypeScript 5
- Tailwind **v4** (CSS-based config, no tailwind.config.ts) · shadcn/ui (radix base, Nova preset, neutral)
- Prisma **7.8** with `prisma-client` generator → `src/generated/prisma`; driver adapter
  `@prisma/adapter-better-sqlite3`; config in `prisma.config.ts`
- Auth.js (next-auth **v5 beta**) + @auth/prisma-adapter · bcryptjs · zod · lucide-react · next-themes
- Node engines pinned `>=24`; Docker target `node:24-bookworm-slim`

## Conventions / gotchas discovered
- Prisma 7 removed `url` from datasource block → URL lives in `prisma.config.ts` (migrate) and is
  passed to the adapter at runtime in `src/lib/db.ts`.
- Adapter export is `PrismaBetterSqlite3` (not `...SQLite3`).
- `.env` is gitignored; `.env.example` is force-tracked via `!.env.example`. `/data` gitignored.
- DB + uploads live under `./data` (local) / `/data` (Docker).

## Phases

- [x] **Phase 0 — Init**: git repo, .gitignore (env + /data + generated), baseline commit.
- [x] **Phase 1 — Scaffold**: create-next-app, shadcn init + 14 components, Prisma schema (User +
      Transcription) + initial migration, `scripts/gen-keys.mjs`, `.env`/`.env.example`,
      `src/lib/db.ts`. `npm run build` clean. ✅
- [ ] **Phase 2 — Auth**: Auth.js Credentials + bcrypt, /register (gated), /login, middleware route
      protection, protected app shell + nav.
- [ ] **Phase 3 — Settings / API key**: AES-256-GCM crypto, /api/key save+masked, /settings UI.
- [ ] **Phase 4 — Upload + transcribe**: validation, voxtral client (EXACT §4 params), /api/transcribe,
      dashboard upload UI.
- [ ] **Phase 5 — Result + history + downloads**: transcript rendering, /transcription/[id], /history,
      /api/transcriptions, .txt/.json download route.
- [ ] **Phase 6 — Dockerize + docs**: Dockerfile (standalone), docker-compose (/data volume), README,
      backup note, final clean build.

## How to resume
1. `cd` into project, `npm install` (postinstall runs `prisma generate`).
2. Ensure `.env` has the 4 secrets (regenerate with `npm run gen-keys` if missing).
3. `npx prisma migrate dev` to sync DB. `npm run dev` to run.
4. Continue at the first unchecked phase above.
