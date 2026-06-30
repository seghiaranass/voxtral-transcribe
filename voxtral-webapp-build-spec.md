# Build Spec — Voxtral Transcription Web App

> **For: Claude Code (local build session)**
> **From: the architect (Anass)**
> Build a self-hostable web application that lets a logged-in user submit audio files to Mistral's Voxtral transcription API, view results (with speaker labels) directly in the UI, keep a history of past transcriptions, and download any transcript. Read this whole file before writing code. Plan first, then build. Ask me if any decision below is unclear — do not guess.

---

## 1. What we are building (one paragraph)

A single-tenant (or small multi-user) web app. A user logs in, saves their Mistral API key once in Settings, then uploads an audio file. The app sends it to Mistral's Voxtral transcription endpoint, gets back a speaker-labelled, timestamped transcript, and displays it in the UI. Every transcription is stored in a history list; the user can re-open any past item, read the transcript inline, and download it as a `.txt` (and `.json`) file. Self-hostable via Docker.

---

## 2. Hard requirements (must all be true when done)

1. **Authentication** — email + password login. Sessions persist. Protected routes redirect to login when not authenticated. Passwords hashed (bcrypt/argon2), never stored plaintext.
2. **API key management** — a Settings page where the user pastes their Mistral API key. The key is **encrypted at rest** (not plaintext in the DB). It is never sent to the frontend after saving (show only `sk-...last4`). It is used server-side only.
3. **Upload & transcribe** — drag-and-drop or file picker for audio (`.mp3 .m4a .wav .ogg .flac .webm`, max 100 MB). Options the user can set per upload: **language** (dropdown of the 13 supported, default "auto"), **diarization** on/off (default on). On submit, show a progress/loading state.
4. **Result display** — show the transcript in the UI: if diarization is on, render each segment as `[mm:ss] Speaker N: text`; if off, render plain text. Show the source filename, duration, and date.
5. **History** — a list of all past transcriptions for the logged-in user (filename, date, language, status, duration). Click an item → opens its full result inline. Newest first.
6. **Download** — each result has a download button: **Download .txt** (formatted, human-readable) and **Download .json** (raw API response). Filename = original audio name + extension.
7. **Self-hostable** — runs via `docker compose up`. One command. Persistent volume for the database and uploaded audio.

---

## 3. Tech stack (use this — chosen for self-hosting simplicity)

- **Frontend + backend:** **Next.js (App Router, TypeScript)** — single deployable app, API routes for the server side. (If you strongly prefer a separate Express/FastAPI backend, propose it first; default is Next.js full-stack.)
- **Database:** **SQLite** via Prisma ORM (zero external DB to run; perfect for self-host single host). Schema migratable to Postgres later by changing the Prisma datasource.
- **Auth:** **Auth.js (NextAuth) Credentials provider** with a hashed-password user table, OR a simple custom JWT/session implementation — pick the simpler-to-self-host option and justify it.
- **Styling:** Tailwind CSS + shadcn/ui components. Clean, professional, light/dark. No emojis as icons — use lucide-react.
- **File storage:** local disk under a Docker volume (`/data/uploads`). Store the DB at `/data/app.db`.
- **Encryption for API key:** AES-256-GCM using a `APP_ENCRYPTION_KEY` from env. Provide a helper to generate it.

---

## 4. The Mistral Voxtral API — EXACT, verified integration (do not guess this)

This was tested live against the real API. Use these exact parameters.

**Endpoint:** `POST https://api.mistral.ai/v1/audio/transcriptions`
**Auth header:** `Authorization: Bearer <USER_API_KEY>`
**Body:** `multipart/form-data` with these fields:

| Field | Value | Notes |
|---|---|---|
| `file` | the audio file | binary |
| `model` | `voxtral-mini-latest` | the transcription model |
| `diarize` | `true` or omit | speaker labels |
| `timestamp_granularities` | `segment` | **REQUIRED when `diarize=true`** — the API returns HTTP 422 without it |
| `language` | e.g. `de`, `en`, `fr` | optional; omit for auto-detect |

**Critical gotcha (already hit and solved in testing):** if `diarize=true` and you do NOT send `timestamp_granularities=segment`, the API rejects with:
`422 — "When diarize is set to True and streaming is disabled, the timestamp granularity must be set to ['segment']"`. So: **whenever diarization is on, always also send `timestamp_granularities=segment`.**

**Response shape (verified — real example):**
```json
{
  "model": "voxtral-mini-latest",
  "text": "Hallo Andreas, wie geht es dir heute? Es geht mir gut, danke. ...",
  "language": null,
  "segments": [
    { "text": "Hallo Andreas, wie geht es dir heute?", "start": 0.6, "end": 3.0, "speaker_id": "speaker_1", "type": "transcription_segment" },
    { "text": " Es geht mir gut, danke.", "start": 4.4, "end": 5.9, "speaker_id": "speaker_2", "type": "transcription_segment" }
  ],
  "usage": { "prompt_audio_seconds": 32, "total_tokens": 89, "request_count": 1 }
}
```

**Rendering rules:**
- If `segments` is non-empty → render each as `[mm:ss] Speaker N: text`, mapping `speaker_1 → Speaker 1`, `speaker_2 → Speaker 2`, etc. Convert `start` (seconds, float) to `mm:ss`.
- If `segments` is empty → render the flat `text` field.
- Store BOTH the formatted text and the raw JSON (for the two download buttons).

**Supported languages (the 13 — use for the dropdown):**
English (en), French (fr), German (de), Spanish (es), Italian (it), Portuguese (pt), Dutch (nl), Russian (ru), Chinese (zh), Japanese (ja), Korean (ko), Hindi (hi), Arabic (ar). Plus an "Auto-detect" option (omit the param).

---

## 5. Data model (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  apiKeyEnc    String?  // AES-256-GCM encrypted Mistral key (nullable until set)
  createdAt    DateTime @default(now())
  transcriptions Transcription[]
}

model Transcription {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  filename      String           // original audio filename
  audioPath     String           // path under /data/uploads
  language      String?          // requested language or null=auto
  diarized      Boolean  @default(true)
  status        String   @default("processing") // processing | done | error
  durationSec   Float?           // from usage.prompt_audio_seconds
  formattedText String?          // rendered transcript for inline display + .txt
  rawJson       String?          // raw API response for .json download
  errorMessage  String?
  createdAt     DateTime @default(now())
}
```

---

## 6. Pages / routes

| Route | Auth | Purpose |
|---|---|---|
| `/login` | public | email+password login |
| `/register` | public (or admin-only — see §9) | create account |
| `/` (dashboard) | protected | upload form + recent history |
| `/history` | protected | full paginated history list |
| `/transcription/[id]` | protected | single result, inline view + download buttons |
| `/settings` | protected | save/update Mistral API key (shows masked) |
| `/api/transcribe` | protected | server: receives upload, calls Mistral, stores result |
| `/api/transcriptions` | protected | list/get history |
| `/api/transcriptions/[id]/download?format=txt\|json` | protected | streams the file download |
| `/api/key` | protected | save (encrypt) / get-masked the API key |

Auth routes via Auth.js handlers.

---

## 7. Key behaviours / edge cases (handle these explicitly)

- **No API key set** → uploading shows a clear message "Add your Mistral API key in Settings first" with a link. Do not call the API.
- **Long audio** → transcription can take time; set the upload route timeout generously and show a processing state. Mark status `processing` immediately, update to `done`/`error` when the API returns.
- **API error (401 bad key / 422 / 429 rate limit / 5xx)** → store `status=error` + `errorMessage`, show it in the UI clearly, do not crash. For 401 specifically: "Your Mistral API key was rejected — check it in Settings."
- **File too large / wrong type** → reject before calling the API with a friendly message.
- **Download filenames** → `<originalname>.txt` and `<originalname>.json`.
- **Security:** the API key must never appear in any client response, log line, or error message. Validate file type server-side, not just client-side.

---

## 8. UI/UX expectations

- Clean, professional dashboard. Sidebar or top nav: Dashboard / History / Settings / Logout.
- Upload area: drag-and-drop with file picker fallback; language dropdown; diarization toggle (default ON); "Transcribe" button with loading spinner.
- Result view: monospace-ish transcript block, speaker labels visually distinct (e.g. Speaker 1 / Speaker 2 colour-coded), timestamps muted/grey. Two download buttons (.txt, .json). Show filename, language, duration, date.
- History: table or card list — filename, date, language, status badge (processing/done/error), duration. Click → result page.
- Light + dark mode. Responsive. lucide-react icons, no emoji.

---

## 9. Config / env (.env.example)

```
DATABASE_URL="file:/data/app.db"
APP_ENCRYPTION_KEY="<32-byte base64 — generate with: openssl rand -base64 32>"
AUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
# Registration policy: set to "false" to disable public signup after you create your account
ALLOW_REGISTRATION="true"
```

- If `ALLOW_REGISTRATION=false`, hide/disable `/register` and the API — single-operator mode. (I will likely set this to false after creating my own account.)

---

## 10. Deliverables

1. Full Next.js app, TypeScript, building with no type errors (`npm run build` clean).
2. `Dockerfile` + `docker-compose.yml` — `docker compose up` brings it up on port 3000 with a persistent `/data` volume (DB + uploads survive restarts).
3. `prisma/schema.prisma` + migration; DB auto-creates on first run.
4. `.env.example` with the vars above and comments.
5. `README.md`: setup, generating the secrets, how to create the first user, how to set the API key, how to run via Docker, and the exact Mistral params used (copy §4).
6. A short note on backups: which files to back up (`/data/app.db`, `/data/uploads`).

---

## 11. Build process I expect (SDLC — follow it)

1. **Plan** — show me the file/folder structure and the steps before coding. Wait for my go.
2. **Build** — auth first, then settings/key encryption, then upload+API integration (use the EXACT §4 params), then result rendering, then history + downloads.
3. **Test** — type-check clean. Test the Mistral call path with a real key + a short audio file end to end. Test the 422/401 error paths. Confirm downloads produce correct files.
4. **Document** — the README above.
5. **Do NOT** push to git, deploy, or change anything outside the project folder. I own deployment.

---

## 12. Out of scope (do not build unless I ask)

- Realtime/streaming transcription (we use batch only).
- Summarization / LLM features (separate project).
- Billing, teams/orgs, role hierarchies beyond simple users.
- The patient-data / GDPR production hardening (this is a personal/testing tool first).

---

### One-line summary for you to act on
Build the Next.js + SQLite + Auth.js app described above, integrate Voxtral with the **exact verified params in §4** (remember: `diarize=true` REQUIRES `timestamp_granularities=segment`), encrypt the API key at rest, show speaker-labelled transcripts inline with .txt/.json downloads and a per-user history, and ship it runnable via `docker compose up`. Plan first, then build.
