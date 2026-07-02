import { createClient } from "@supabase/supabase-js";

const AUDIOSHAKE_BASE_URL = "https://api.audioshake.ai";
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 360; // 30 minutes total
const STEM_MODELS = ["vocals", "drums", "bass", "other"] as const;

export type StemModel = (typeof STEM_MODELS)[number];

interface AudioShakeAssetResponse {
  id: string;
  format: string;
  name: string;
}

interface AudioShakeTaskResponse {
  id: string;
  createdAt: string;
  completedAt: string | null;
  assetId: string;
  url: string | null;
  metadata: string;
  targets: {
    id: string;
    model: StemModel;
    status: "processing" | "completed" | "error";
    formats: string[];
    output?: {
      name: string;
      format: string;
      link: string;
    }[];
    error?: {
      code: number;
      message: string;
    };
    duration: number;
  }[];
}

export interface StemResult {
  model: StemModel;
  format: string;
  storagePath: string;
  storageBucket: string;
  fileSizeBytes: number;
}

class AudioShakeClient {
  private apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("AudioShake API key is required");
    }
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      "x-api-key": this.apiKey,
      "Content-Type": "application/json",
    };
  }

  async uploadAudio(fileBuffer: Buffer, fileName: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], {
      type: "audio/wav",
    });
    formData.append("file", blob, fileName);

    const response = await fetch(`${AUDIOSHAKE_BASE_URL}/assets`, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AudioShake asset upload failed (${response.status}): ${error}`
      );
    }

    const data = (await response.json()) as AudioShakeAssetResponse;
    return data.id;
  }

  async createStemTask(assetId: string): Promise<string> {
    const targets = STEM_MODELS.map((model) => ({
      model,
      formats: ["wav"],
    }));

    const response = await fetch(`${AUDIOSHAKE_BASE_URL}/tasks`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({
        assetId,
        targets,
        metadata: "AudiotoNotes stem separation",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AudioShake task creation failed (${response.status}): ${error}`
      );
    }

    const data = (await response.json()) as { id: string };
    return data.id;
  }

  async getTask(taskId: string): Promise<AudioShakeTaskResponse> {
    const response = await fetch(`${AUDIOSHAKE_BASE_URL}/tasks/${taskId}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(
        `AudioShake task fetch failed (${response.status}): ${error}`
      );
    }

    return (await response.json()) as AudioShakeTaskResponse;
  }

  async downloadFile(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to download file from AudioShake (${response.status})`
      );
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async pollUntilComplete(taskId: string): Promise<AudioShakeTaskResponse> {
    let attempts = 0;

    while (attempts < MAX_POLL_ATTEMPTS) {
      const task = await this.getTask(taskId);

      const allTargetsResolved = task.targets.every(
        (t) => t.status === "completed" || t.status === "error"
      );

      if (allTargetsResolved) {
        return task;
      }

      attempts++;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(`AudioShake task polling timeout after ${MAX_POLL_ATTEMPTS} attempts`);
  }
}

export async function processAudioShakeStemSeparation(
  projectId: string,
  uploadId: string,
  storagePath: string,
  stemsBucket: string,
  onProgress?: (message: string) => void
): Promise<StemResult[]> {
  const apiKey = process.env.AUDIOSHAKE_API_KEY;
  if (!apiKey) {
    throw new Error("AUDIOSHAKE_API_KEY environment variable is not set");
  }

  const client = new AudioShakeClient(apiKey);
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1. Download audio from Supabase Storage
    onProgress?.("Downloading audio from storage");
    const bucket = process.env.STORAGE_BUCKET_AUDIO ?? "audio-raw";
    const { data: audioBuffer, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (downloadError || !audioBuffer) {
      throw new Error(`Failed to download audio: ${downloadError?.message}`);
    }

    // 2. Upload to AudioShake
    onProgress?.("Uploading to AudioShake");
    const fileName = storagePath.split("/").pop() || "audio.wav";
    const assetId = await client.uploadAudio(
      Buffer.from(await audioBuffer.arrayBuffer()),
      fileName
    );
    onProgress?.(`AudioShake asset created: ${assetId}`);

    // 3. Create stem separation task
    onProgress?.("Creating stem separation task");
    const taskId = await client.createStemTask(assetId);
    onProgress?.(`AudioShake task created: ${taskId}`);

    // 4. Poll until complete
    onProgress?.("Separating stems (this may take a few minutes)");
    const completedTask = await client.pollUntilComplete(taskId);

    // 5. Download and store results
    onProgress?.("Downloading separated stems");
    const results: StemResult[] = [];

    for (const target of completedTask.targets) {
      if (target.status === "error") {
        onProgress?.(
          `Warning: Stem ${target.model} failed: ${target.error?.message}`
        );
        continue;
      }

      if (!target.output || target.output.length === 0) {
        onProgress?.(`Warning: No output for stem ${target.model}`);
        continue;
      }

      for (const output of target.output) {
        // Download immediately (links expire in 1 hour)
        onProgress?.(`Downloading ${target.model} stem`);
        const stemBuffer = await client.downloadFile(output.link);

        // Upload to Supabase Storage
        const storageStemPath = `${projectId}/${uploadId}/${target.model}.${output.format}`;
        onProgress?.(`Uploading ${target.model} to storage`);

        const { error: uploadError } = await supabase.storage
          .from(stemsBucket)
          .upload(storageStemPath, stemBuffer, {
            contentType: `audio/${output.format}`,
            upsert: true,
          });

        if (uploadError) {
          throw new Error(
            `Failed to upload stem ${target.model}: ${uploadError.message}`
          );
        }

        results.push({
          model: target.model,
          format: output.format,
          storagePath: storageStemPath,
          storageBucket: stemsBucket,
          fileSizeBytes: stemBuffer.length,
        });

        onProgress?.(
          `Completed ${target.model} stem (${stemBuffer.length} bytes)`
        );
      }
    }

    return results;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AudioShake processing failed: ${message}`);
  }
}
