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

    // Ensure anonymous session context — sign in as service role doesn't need user session
    // Path: audio-raw/uploads/{timestamp}-{filename}
    const ext = filename.split('.').pop() ?? 'bin'
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `uploads/${Date.now()}-${safeName}`

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath)

    if (error || !data) {
      console.error('Storage signed URL error:', error)
      return NextResponse.json({ error: error?.message ?? 'Failed to create upload URL' }, { status: 500 })
    }

    // Create project record
    const projectId = crypto.randomUUID()
    const { error: dbError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        // No user_id for anonymous MVP — we'll wire auth later
        title: filename.replace(/\.[^.]+$/, ''),
        status: 'processing',
        audio_filename: filename,
      })

    if (dbError) {
      console.error('DB project insert failed:', dbError.message, dbError.code)
      return NextResponse.json({ error: 'Failed to create project record' }, { status: 500 })
    }

    return NextResponse.json({
      signedUrl: data.signedUrl,
      storagePath,
      projectId,
    })
  } catch (err) {
    console.error('signed-url error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
