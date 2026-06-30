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
- [x] **Phase 2 — Auth**: Auth.js v5 Credentials + bcrypt(12), JWT sessions. Files: `auth.config.ts`
      (edge-safe, route protection in `authorized` cb), `auth.ts` (Node, Credentials+prisma+bcrypt),
      `src/proxy.ts` (renamed from middleware — Next 16 convention), `/api/auth/[...nextauth]`,
      `/api/register` (gated by `lib/registration.ts`), `/login` + `/register` pages + forms,
      `app-nav.tsx` + `theme-toggle.tsx`, `(app)/layout.tsx` protected shell, `providers.tsx` (theme),
      `next-auth.d.ts` (session.user.id). Smoke-tested via curl: register 201 / dup 409 / weak-pw 400 /
      unauth `/`→307 `/login` / credential sign-in→302 + session cookie / authed `/`→200. ✅
      NOTE: shadcn installed **Base UI** (`@base-ui/react`) not Radix → use `render={<X/>}` prop,
      NOT `asChild`. Test user `test@example.com` exists in local dev DB (gitignored).
- [x] **Phase 3 — Settings / API key**: `lib/crypto.ts` (AES-256-GCM, format `iv:tag:ct` base64,
      `maskSecret`→`••••••••last4`), `lib/api-key.ts` (save/clear/get/hasApiKey/getMaskedApiKey),
      `lib/session.ts` (`currentUserId`), `/api/key` GET/POST/DELETE, `/settings` page +
      `settings/api-key-form.tsx`. Verified: crypto round-trip ok (32-byte key), save→masked,
      whitespace→400, no plaintext leak in GET, DELETE clears. ✅
- [x] **Phase 4 — Upload + transcribe**: `lib/transcript.ts` (types + `formatTranscript`/`formatTimestamp`/
      `speakerLabel`/`speakerNumber`), `lib/voxtral.ts` (EXACT §4 params; diarize⇒`timestamp_granularities=segment`;
      `VoxtralError` with key-free `userMessage`; 401/403/413/422/429/5xx mapping), `lib/storage.ts`
      (saveUpload→UPLOAD_DIR, uuid filename), `/api/transcribe` (runtime=nodejs, maxDuration=600; creates
      record `processing`→`done`/`error`), `components/upload/upload-form.tsx` (drag-drop, language Select,
      diarization Switch default ON, loading), dashboard renders it with `hasApiKey` banner. Verified live:
      no-key→400 NO_API_KEY, wrong-type→400 (server log), no-file→400, **real Mistral 401→mapped + stored
      error** (params accepted). Success path needs user's real key. ✅
      NOTE: returns HTTP 200 with `{id,status:"error",error}` when Mistral fails (so client routes to result
      page); 4xx only for validation/no-key. Turbopack emits a harmless dynamic-path warning for storage.ts.
- [x] **Phase 5 — Result + history + downloads**: `transcript.ts` (+`parseStoredJson`),
      `components/transcript/transcript-view.tsx` (segment rows, speaker colour palette, muted ts),
      `components/status-badge.tsx`, `components/history/history-list.tsx` (responsive table),
      `/transcription/[id]` (inline view, processing/error/done states, download buttons),
      `/history` (paginated, 20/pg), dashboard "Recent" (last 5), `/api/transcriptions` (GET list),
      `/api/transcriptions/[id]/download?format=txt|json` (auth+ownership, filename = base+ext, RFC6266
      Content-Disposition). Verified via seeded "done" record: result renders 2 speakers + ts 0:00/0:04,
      history lists it, .txt body formatted correctly (filename interview.txt), .json = raw response
      (filename interview.json). ✅
- [x] **Phase 6 — Dockerize + docs**: `next.config.ts` (serverExternalPackages for better-sqlite3/
      prisma), multi-stage `Dockerfile` (node:24-bookworm-slim; builder compiles better-sqlite3 then
      builds; runner copies node_modules+.next+prisma — NON-standalone so `prisma migrate deploy` works),
      `docker-entrypoint.sh` (mkdir /data, migrate deploy, `next start`), `docker-compose.yml`
      (port 3000, env_file .env, DATABASE_URL/UPLOAD_DIR→/data, AUTH_TRUST_HOST, named volume
      voxtral-data), `.dockerignore`, full `README.md` (setup/secrets/first-user/docker/§4 params/
      backups), `.gitattributes` *.sh eol=lf. **Verified live**: `docker compose build` ok, `up`→migrations
      auto-applied + /login 200, in-container register/sign-in/key-encrypt/Mistral-401 all pass, **restart
      → data persists** (volume). Final `npm run build` clean (13 routes). ✅

## Bugfix (post-launch)
- **Account dropdown crashed the page** ("This page couldn't load") on click — root cause:
  `DropdownMenuLabel` (Base UI `Menu.GroupLabel`) was used directly in `DropdownMenuContent` without a
  surrounding `DropdownMenuGroup` → runtime `Base UI error #31: MenuGroupContext is missing`. Fixed in
  `app-nav.tsx` by rendering the email as a plain `div` instead of the group-bound label. Verified with
  headless Chrome (puppeteer) in BOTH dev and the rebuilt prod container: menu opens, no error.
  **Lesson:** Base UI "group parts" (`*Label`) require a `*Group` parent — audited; no other misuse.

## ✅ ALL PHASES COMPLETE — app builds, type-checks, and runs via `docker compose up`.
Remaining for the user: supply a real Mistral API key in Settings and run a real audio file end-to-end
(only the success path needs a valid key; 401/422/validation paths verified).

## How to resume
1. `cd` into project, `npm install` (postinstall runs `prisma generate`).
2. Ensure `.env` has the 4 secrets (regenerate with `npm run gen-keys` if missing).
3. `npx prisma migrate dev` to sync DB. `npm run dev` to run.
4. Continue at the first unchecked phase above.
