import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createServiceClient()
    const { data, error } = await supabase
      .from('projects')
      .select('id, title, status, audio_filename, created_at')
      .eq('id', id)
      .single()

    if (error || !data) {
      // If DB not yet applied, return a mock project for UI testing
      if (error?.code === '42P01') {
        return NextResponse.json({
          id,
          title: 'Demo Project',
          status: 'separating',
          audioFilename: 'demo.mp3',
          createdAt: new Date().toISOString(),
        })
      }
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: data.id,
      title: data.title,
      status: data.status,
      audioFilename: data.audio_filename,
      createdAt: data.created_at,
    })
  } catch (err) {
    console.error('project GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
