import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { tasks } from '@trigger.dev/sdk/v3'
import { processAudioTask } from '@/trigger/processAudio'

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json()

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    // Mark upload completed and fetch the row to get projectId + storagePath
    const { data: upload, error } = await supabase
      .from('audio_uploads')
      .update({
        upload_status: 'completed',
        upload_confirmed_at: new Date().toISOString(),
      })
      .eq('id', uploadId)
      .select('id, project_id, storage_path')
      .single()

    if (error || !upload) {
      console.error('DB confirm upload failed:', error?.message, error?.code)
      return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 })
    }

    // Trigger the processing pipeline
    try {
      await tasks.trigger<typeof processAudioTask>('process-audio', {
        projectId: upload.project_id,
        uploadId: upload.id,
        storagePath: upload.storage_path,
      })
    } catch (triggerErr) {
      console.error('Trigger.dev task dispatch failed:', triggerErr)
      return NextResponse.json({ error: 'Failed to queue processing job' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
