import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { filename, size, mimeType } = await req.json()

    if (!filename || !size || !mimeType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const bucket = process.env.STORAGE_BUCKET_AUDIO ?? 'audio-raw'
    const supabase = await createServiceClient()

    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `uploads/${Date.now()}-${safeName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('Storage signed URL error:', error)
      return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
    }

    // Create project row
    const projectId = crypto.randomUUID()
    const { error: projectError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        title: filename.replace(/\.[^.]+$/, ''),
        status: 'processing',
        audio_filename: filename,
      })

    if (projectError) {
      console.error('DB project insert failed:', projectError.message, projectError.code)
      return NextResponse.json({ error: 'Failed to create project record' }, { status: 500 })
    }

    // Create audio_uploads row — status starts as 'pending' until client confirms the file landed
    const uploadId = crypto.randomUUID()
    const { error: uploadError } = await supabase
      .from('audio_uploads')
      .insert({
        id: uploadId,
        project_id: projectId,
        original_filename: filename,
        file_size_bytes: size,
        mime_type: mimeType,
        storage_path: storagePath,
        storage_bucket: bucket,
        upload_status: 'pending',
      })

    if (uploadError) {
      console.error('DB audio_uploads insert failed:', uploadError.message, uploadError.code)
      return NextResponse.json({ error: 'Failed to create upload record' }, { status: 500 })
    }

    console.log(`[upload:signed-url] file="${filename}" size=${size} projectId=${projectId} uploadId=${uploadId}`)
    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
      projectId,
      uploadId,
    })
  } catch (err) {
    console.error('signed-url error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
