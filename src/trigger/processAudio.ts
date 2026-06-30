import { task, wait, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";

interface ProcessAudioPayload {
  projectId: string;
  uploadId: string;
  storagePath: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export const processAudioTask = task({
  id: "process-audio",
  maxDuration: 3600,
  retry: { maxAttempts: 3 },

  run: async (payload: ProcessAudioPayload) => {
    const { projectId, uploadId, storagePath } = payload;
    const supabase = getSupabase();

    logger.log("Starting audio processing", { projectId, storagePath });

    // ── 1. Create processing_jobs row ─────────────────────────────────────────
    const { data: job, error: jobError } = await supabase
      .from("processing_jobs")
      .insert({
        project_id: projectId,
        audio_upload_id: uploadId,
        status: "uploaded",
        started_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to create processing job: ${jobError?.message}`);
    }

    const jobId = job.id;
    logger.log("Job created", { jobId });

    // Helper to update job status — DB trigger syncs projects.status automatically
    async function setStatus(
      status: string,
      extra?: Record<string, unknown>
    ) {
      const { error } = await supabase
        .from("processing_jobs")
        .update({ status, updated_at: new Date().toISOString(), ...extra })
        .eq("id", jobId);
      if (error) throw new Error(`Failed to update status to ${status}: ${error.message}`);
      logger.log("Status updated", { status });
    }

    // ── 2. Stem separation (Demucs) ───────────────────────────────────────────
    await setStatus("separating");
    // TODO: download storagePath from audio-raw, run Demucs, write stems to audio-stems
    await wait.for({ seconds: 5 });
    await setStatus("transcribing", {
      separation_done_at: new Date().toISOString(),
    });

    // ── 3. MIDI transcription (Basic-pitch) ───────────────────────────────────
    // TODO: run Basic-pitch on each stem, write MIDI to midi-files, insert transcriptions rows
    await wait.for({ seconds: 5 });
    await setStatus("generating_score", {
      transcription_done_at: new Date().toISOString(),
    });

    // ── 4. Score generation (music21) ─────────────────────────────────────────
    // TODO: convert MIDI to MusicXML, write to musicxml-files, insert scores rows
    await wait.for({ seconds: 5 });
    await setStatus("completed", {
      score_done_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      progress_pct: 100,
    });

    logger.log("Processing complete", { projectId, jobId });
    return { projectId, jobId };
  },
});
