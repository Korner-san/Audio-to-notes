# AudiotoNotes — Pipeline Implementation Plan

## Current state
- Upload → Supabase Storage ✓
- Project + audio_uploads rows created ✓
- Trigger.dev task fires and updates status ✓ (stub only)
- audio_stems, transcriptions, scores tables exist but are empty

## Goal
Full pipeline: Upload → Stems → MIDI → MusicXML → UI playback + sheet music

---

## Step 1 — AudioShake stem separation (in Trigger.dev task)

**What it does:** Sends the uploaded audio to AudioShake API, which returns
separated stems (vocals, bass, drums, guitar, piano) as audio file URLs.

**Tasks:**
- [ ] 1a. Read AudioShake API docs to confirm: auth header, submit endpoint, polling endpoint, response shape
- [ ] 1b. In `processAudio.ts`: download the original audio from Supabase Storage (`audio-raw` bucket)
- [ ] 1c. POST to AudioShake to submit the job (multipart/form-data upload)
- [ ] 1d. Poll AudioShake until job is complete (use `wait.for` between polls)
- [ ] 1e. For each returned stem:
  - Download the stem audio file from AudioShake URL
  - Upload to Supabase Storage `audio-stems` bucket
  - Insert a row into `audio_stems` table
- [ ] 1f. Update `processing_jobs` status to `transcribing` when done

**DB rows written:** `audio_stems` (one per stem — vocals, bass, drums, guitar, piano)

**Env vars needed (already in Vercel + Trigger.dev prod):**
- `AUDIOSHAKE_API_KEY`
- `STORAGE_BUCKET_STEMS` = `audio-stems`

---

## Step 2 — MIDI transcription (Python via Modal)

**What it does:** Runs Basic-pitch on each stem audio file to produce a MIDI file
with detected notes, tempo, and key signature.

**Why Modal:** Basic-pitch is Python-only. Modal lets us run Python serverless
functions and call them via HTTP from the Trigger.dev task.

**Tasks:**
- [ ] 2a. Create a Modal account and project
- [ ] 2b. Write a Modal function (`modal_worker/transcribe.py`):
  - Accept: stem audio URL (from Supabase Storage signed URL)
  - Run Basic-pitch on it
  - Return: MIDI bytes + metadata (tempo, key, note count, time signature)
- [ ] 2c. Deploy the Modal function and get its HTTP endpoint URL
- [ ] 2d. Add `MODAL_TRANSCRIBE_URL` and `MODAL_API_KEY` to Vercel + Trigger.dev env vars
- [ ] 2e. In `processAudio.ts`: for each stem, call the Modal endpoint
- [ ] 2f. Upload returned MIDI to Supabase Storage `midi-files` bucket
- [ ] 2g. Insert a row into `transcriptions` table per stem
- [ ] 2h. Update `processing_jobs` status to `generating_score` when done

**DB rows written:** `transcriptions` (one per stem)

---

## Step 3 — MusicXML generation (Python via Modal)

**What it does:** Converts each MIDI file to MusicXML using music21, producing
sheet music notation.

**Tasks:**
- [ ] 3a. Write a Modal function (`modal_worker/score.py`):
  - Accept: MIDI file URL
  - Run music21 to convert MIDI → MusicXML
  - Return: MusicXML string
- [ ] 3b. Deploy and get endpoint URL
- [ ] 3c. Add `MODAL_SCORE_URL` to Vercel + Trigger.dev env vars
- [ ] 3d. In `processAudio.ts`: for each transcription, call the Modal endpoint
- [ ] 3e. Store MusicXML in Supabase Storage `musicxml-files` bucket
- [ ] 3f. Insert a row into `scores` table per transcription
- [ ] 3g. Update `processing_jobs` status to `completed` when all done

**DB rows written:** `scores` (one per stem)

---

## Step 4 — API routes for the project page

**What it does:** Expose the stems, MIDI, and scores via API so the frontend can
read and display them.

**Tasks:**
- [ ] 4a. `GET /api/projects/[id]/stems` — returns `audio_stems` rows with signed
  playback URLs from Supabase Storage
- [ ] 4b. `GET /api/projects/[id]/stems/[stemId]/score` — returns the MusicXML
  content for a stem (from `scores` table)
- [ ] 4c. `GET /api/projects/[id]/export/[type]` — returns a signed download URL
  for MIDI, MusicXML, or PDF per stem

---

## Step 5 — UI: stem playback

**What it does:** Make the stem buttons (Vocals, Piano, Guitar, Bass) actually
play back the separated audio.

**Tasks:**
- [ ] 5a. Fetch stems from `/api/projects/[id]/stems` on the project page
- [ ] 5b. Replace placeholder `StemList` with real data — show each stem with a
  play/pause button
- [ ] 5c. Wire up HTML5 audio player per stem using the signed Supabase URL
- [ ] 5d. Show stem status (pending / processing / completed / failed) while
  processing is ongoing

---

## Step 6 — UI: sheet music preview

**What it does:** Render the MusicXML as sheet music in the browser.

**Tasks:**
- [ ] 6a. Install `opensheetmusicdisplay` (OSMD) — a browser MusicXML renderer
- [ ] 6b. When user clicks "View Notes" on a stem, fetch that stem's score
- [ ] 6c. Render MusicXML using OSMD in the Sheet Music Preview panel
- [ ] 6d. Add transpose and clef controls that update the score view

---

## Step 7 — UI: export downloads

**What it does:** Make MIDI, MusicXML, and PDF download buttons work.

**Tasks:**
- [ ] 7a. Wire MIDI download → signed URL from `transcriptions.midi_storage_path`
- [ ] 7b. Wire MusicXML download → signed URL from `scores.musicxml_storage_path`
- [ ] 7c. PDF export → generate PDF from MusicXML (can use OSMD print-to-PDF or
  a separate service). Only if `FEATURE_PDF_EXPORT=true`.

---

## Order of execution

```
Step 1 (AudioShake) → Step 4a → Step 5 (stems play)
       ↓
Step 2 (MIDI)       → Step 4c → Step 7a (MIDI download)
       ↓
Step 3 (MusicXML)   → Step 4b → Step 6 (sheet music) → Step 7b/7c
```

Steps 1 → 4a → 5 can ship as a standalone milestone (stems only).
Steps 2 + 3 + 4b + 6 ship as the second milestone (full score).

---

## What we are NOT doing (deferred)

- Demucs local Python worker — replaced by AudioShake
- Note editor (`FEATURE_NOTE_EDITOR`) — deferred
- Billing (`FEATURE_BILLING`) — deferred
- Auth / user accounts — anonymous auth stays for now
