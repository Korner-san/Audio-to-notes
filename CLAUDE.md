# AudiotoNotes — Project Rules

## Git & Deployment

**Rule: After every code change, always commit and push to GitHub.**

- Vercel auto-deploys on every push to `master`, so pushing = deploying.
- Never leave changes as local-only edits. Commit immediately after making a fix.
- Use a short, descriptive commit message.
- Never assume deployment hasn't finished. The user always waits for deployment before reporting issues. Never push empty commits or suggest redeploying as a fix.

## Environment Variables

**Rule: All env vars live in Vercel. NEVER touch any env file.**

- There is NO `.env.example`, NO `.env.local`, NO `.env` — nothing like that. Do not create, edit, or reference any env file ever.
- Do not ask the user to set up local env vars.
- Never hardcode secrets, keys, or URLs. Always use `process.env.VAR_NAME`.
- If a new env var is needed: tell the user the variable name and where to get the value, and say "add it in Vercel → Project → Settings → Environment Variables." That is all.

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

## Logging

**Rule: Always log key user-experience steps with the filename and relevant IDs.**

Every API route that touches the upload or processing flow must emit a `console.log` at each meaningful step so Vercel logs are readable during debugging. Required log points:
- `signed-url`: filename, size, projectId, uploadId created
- `confirm`: uploadId received, projectId resolved, Trigger.dev task dispatched
- `processAudio` task: task started (filename/projectId), each status transition, completion or error

Log format: one line per event, include filename or projectId so logs can be correlated. Use `console.error` for failures (already returns 500). Never log secrets or full file contents.

## Processing pipeline (current state)

The Python ML worker (Demucs → Basic-pitch → music21) is **not yet connected**.
- Upload flow → Supabase Storage ✓
- Project record creation → Supabase DB ✓
- Stem separation, MIDI, MusicXML → placeholder / future worker
- Do not attempt to run Basic-pitch, music21, or Demucs inside Vercel functions.
