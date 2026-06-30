import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { uploadId } = await req.json()

    if (!uploadId) {
      return NextResponse.json({ error: 'Missing uploadId' }, { status: 400 })
    }

    const supabase = await createServiceClient()

    const { error } = await supabase
      .from('audio_uploads')
      .update({
        upload_status: 'completed',
        upload_confirmed_at: new Date().toISOString(),
      })
      .eq('id', uploadId)

    if (error) {
      console.error('DB confirm upload failed:', error.message, error.code)
      return NextResponse.json({ error: 'Failed to confirm upload' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('confirm error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
