'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ProcessingTimeline, type JobStatus } from '@/components/project/ProcessingTimeline'
import { StemList } from '@/components/project/StemList'
import { ExportPanel } from '@/components/project/ExportPanel'
import { Badge } from '@/components/ui/Badge'
import { Music2, Clock } from 'lucide-react'

interface ProjectData {
  id: string
  title: string
  status: JobStatus
  audioFilename: string | null
  createdAt: string
}

function statusBadge(status: JobStatus) {
  if (status === 'completed') return <Badge variant="success" dot>Ready</Badge>
  if (status === 'failed')    return <Badge variant="error" dot>Failed</Badge>
  return <Badge variant="purple" dot>Processing</Badge>
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/projects/${id}`)
        if (!res.ok) throw new Error('Project not found')
        const data = await res.json()
        if (!cancelled) {
          setProject(data)
          setLoading(false)
          // Keep polling while still processing
          if (data.status !== 'completed' && data.status !== 'failed') {
            setTimeout(poll, 3000)
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load project')
          setLoading(false)
        }
      }
    }

    poll()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          </div>
          <p className="text-slate-400">Loading project…</p>
        </div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-red-400 font-medium">{error ?? 'Project not found'}</p>
          <a href="/" className="mt-4 inline-block text-sm text-violet-400 hover:text-violet-300">
            ← Back to dashboard
          </a>
        </div>
      </div>
    )
  }

  const isProcessing = project.status !== 'completed' && project.status !== 'failed'

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      {/* Project header */}
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-900/40">
            <Music2 className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{project.title}</h1>
              {statusBadge(project.status)}
            </div>
            {project.audioFilename && (
              <p className="text-sm text-slate-500 font-mono">{project.audioFilename}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Clock className="h-3.5 w-3.5" />
          {new Date(project.createdAt).toLocaleString()}
        </div>
      </div>

      {/* Pulsing banner while processing */}
      {isProcessing && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-violet-800/40 bg-violet-950/30 px-4 py-3">
          <div className="h-2 w-2 rounded-full bg-violet-400 animate-pulse" />
          <p className="text-sm text-violet-300">
            Your audio is being processed. This usually takes 2–3 minutes.
            This page updates automatically.
          </p>
        </div>
      )}

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: timeline + stems */}
        <div className="space-y-6 lg:col-span-2">
          <ProcessingTimeline status={project.status} />

          {/* Score preview placeholder */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Sheet music preview
            </h2>
            {project.status === 'completed' ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-border bg-surface-raised">
                <div className="text-center">
                  <Music2 className="mx-auto mb-2 h-8 w-8 text-violet-400" />
                  <p className="text-sm text-slate-300 font-medium">Score ready</p>
                  <p className="text-xs text-slate-500 mt-1">Select a stem to view its notation</p>
                </div>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-surface-raised/50">
                <div className="text-center">
                  <div className="mb-3 grid grid-cols-4 gap-1 opacity-30">
                    {Array.from({ length: 32 }).map((_, i) => (
                      <div key={i} className="h-0.5 rounded-full bg-slate-600" style={{ width: `${20 + Math.random() * 60}%` }} />
                    ))}
                  </div>
                  <p className="text-sm text-slate-600">Score preview will appear here</p>
                </div>
              </div>
            )}
          </div>

          <StemList jobStatus={project.status} />
        </div>

        {/* Right column: export */}
        <div className="space-y-6">
          {/* Original audio player placeholder */}
          <div className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Original audio
            </h2>
            <div className="rounded-xl border border-border bg-surface-raised p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-900/40">
                  <Music2 className="h-3.5 w-3.5 text-violet-400" />
                </div>
                <p className="text-sm text-slate-300 truncate font-mono">
                  {project.audioFilename ?? 'audio.mp3'}
                </p>
              </div>
              {/* Fake waveform */}
              <div className="flex h-10 items-center gap-0.5 overflow-hidden rounded-lg bg-surface-overlay px-3">
                {Array.from({ length: 60 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-0.5 shrink-0 rounded-full bg-violet-600/50"
                    style={{ height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 20}%` }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                <span>0:00</span>
                <span className="text-slate-600">— Playback available after processing —</span>
                <span>—:——</span>
              </div>
            </div>
          </div>

          <ExportPanel jobStatus={project.status} />

          {/* Info card */}
          <div className="rounded-2xl border border-border bg-surface p-5 text-xs text-slate-500 space-y-2">
            <p className="font-medium text-slate-400">Project ID</p>
            <p className="font-mono text-slate-600 break-all">{project.id}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
