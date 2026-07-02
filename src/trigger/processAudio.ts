import { task, wait, logger } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import { processAudioShakeStemSeparation } from "@/lib/audioshake";

interface ProcessAudioPayload {
  projectId: string;
  uploadId: string;
  storagePath: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { realtime: { transport: ws as unknown as typeof WebSocket } }
  );
}

export const processAudioTask = task({
  id: "process-audio",
  maxDuration: 3600,
  retry: { maxAttempts: 3 },

  run: async (payload: ProcessAudioPayload) => {
    const { projectId, uploadId, storagePath } = payload;

    logger.log("Task started", {
      projectId,
      storagePath,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    const supabase = getSupabase();
    logger.log("Supabase client created — inserting processing_jobs row");

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

    // ── 2. Stem separation (AudioShake) ──────────────────────────────────────
    await setStatus("separating");

    const stemsBucket = process.env.STORAGE_BUCKET_STEMS ?? "audio-stems";
    const stemResults = await processAudioShakeStemSeparation(
      projectId,
      uploadId,
      storagePath,
      stemsBucket,
      (msg) => logger.log(msg)
    );

    logger.log("Stem separation complete", {
      stemsCount: stemResults.length,
      stems: stemResults.map((s) => ({ model: s.model, size: s.fileSizeBytes })),
    });

    // Insert audio_stems rows for each separated stem
    for (const stem of stemResults) {
      const { error: stemError } = await supabase
        .from("audio_stems")
        .insert({
          project_id: projectId,
          processing_job_id: jobId,
          stem_type: stem.model,
          storage_path: stem.storagePath,
          storage_bucket: stem.storageBucket,
          file_size_bytes: stem.fileSizeBytes,
          status: "completed",
          separation_model: "audioshake",
        });

      if (stemError) {
        logger.error(
          `Failed to insert stem ${stem.model}: ${stemError.message}`
        );
        throw new Error(
          `Failed to insert audio_stems row for ${stem.model}: ${stemError.message}`
        );
      }
    }

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
