# AudiotoNotes — Project Rules

## Environment Variables

**Rule: All env vars live in Vercel. Never manage them locally.**

- `.env.example` is the only env file in this repo. It is documentation only.
- `.env.local` is intentionally absent. Do not create it.
- Do not ask the user to set up local env vars. Assume every variable in `.env.example` is already configured in the Vercel project dashboard.
- Never hardcode secrets, keys, or URLs. Always use `process.env.VAR_NAME`.
- If a new env var is needed: add it to `.env.example` with a comment, and tell the user to add it in Vercel → Project → Settings → Environment Variables.

## Stack

- **Frontend + API routes**: Next.js 14 App Router, deployed on Vercel
- **Database + Auth + Storage**: Supabase (connected via Vercel env vars)
- **Queue**: Trigger.dev (project: `proj_abrpwuuujlclbyhapljn`)
- **Styling**: Tailwind CSS v3, dark mode

## Key env vars

| Variable | Where used |
|----------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server (anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only API routes. Never expose to browser. |
| `STORAGE_BUCKET_AUDIO` | `audio-raw` bucket name |
| `STORAGE_BUCKET_STEMS` | `audio-stems` bucket name |
| `STORAGE_BUCKET_MIDI` | `midi-files` bucket name |
| `STORAGE_BUCKET_MUSICXML` | `musicxml-files` bucket name |
| `STORAGE_BUCKET_EXPORTS` | `exports` bucket name |
| `AUDIOSHAKE_API_KEY` | Server-only |
| `FEATURE_USE_AUDIOSHAKE` | `true` / `false` |
| `FEATURE_NOTE_EDITOR` | `true` / `false` |
| `FEATURE_PDF_EXPORT` | `true` / `false` |
| `FEATURE_BILLING` | `true` / `false` |

## Supabase client usage

- `src/lib/supabase/client.ts` — browser client (uses publishable key)
- `src/lib/supabase/server.ts` — server client (uses publishable key or service role key)
- Never import `createServiceClient` in client components or `'use client'` files.

## Processing pipeline (current state)

The Python ML worker (Demucs → Basic-pitch → music21) is **not yet connected**.
- Upload flow → Supabase Storage ✓
- Project record creation → Supabase DB ✓
- Stem separation, MIDI, MusicXML → placeholder / future worker
- Do not attempt to run Basic-pitch, music21, or Demucs inside Vercel functions.
