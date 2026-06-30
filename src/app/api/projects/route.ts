import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, status, audio_filename, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      if (error.code === '42P01') return NextResponse.json({ projects: [] })
      throw error
    }

    return NextResponse.json({
      projects: (data ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        audioFilename: p.audio_filename,
        createdAt: p.created_at,
      })),
    })
  } catch (err) {
    console.error('projects GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, audioFilename, storagePath } = body

    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('projects')
      .insert({ title: title ?? 'Untitled Project', audio_filename: audioFilename, status: 'processing' })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ projectId: data.id }, { status: 201 })
  } catch (err) {
    console.error('projects POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
