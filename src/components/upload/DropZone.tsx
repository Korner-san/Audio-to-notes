'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileAudio, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { clsx } from 'clsx'
import { Button } from '@/components/ui/Button'
import { createClient } from '@/lib/supabase/client'

const ACCEPTED = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/flac', 'audio/x-flac']
const MAX_BYTES = 50 * 1024 * 1024

type Phase = 'idle' | 'dragging' | 'selected' | 'uploading' | 'done' | 'error'

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1024 ** 2).toFixed(1)} MB`
}

function validateFile(file: File): string | null {
  if (!ACCEPTED.includes(file.type) && !file.name.match(/\.(mp3|wav|m4a|flac)$/i))
    return 'Unsupported format. Please upload MP3, WAV, M4A, or FLAC.'
  if (file.size > MAX_BYTES)
    return `File too large (${formatBytes(file.size)}). Maximum is 50 MB.`
  return null
}

export function DropZone() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)

  const pickFile = useCallback((f: File) => {
    const err = validateFile(f)
    if (err) { setError(err); setPhase('error'); return }
    setError(null)
    setFile(f)
    setPhase('selected')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setPhase('idle')
    const f = e.dataTransfer.files[0]
    if (f) pickFile(f)
  }, [pickFile])

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) pickFile(f)
  }, [pickFile])

  const reset = () => { setFile(null); setPhase('idle'); setError(null); setProgress(0) }

  async function handleUpload() {
    if (!file) return
    setPhase('uploading')
    setProgress(0)

    try {
      // 1. Ensure anonymous session
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        await supabase.auth.signInAnonymously()
      }

      // 2. Get signed upload URL from API (also creates project + audio_uploads rows)
      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, size: file.size, mimeType: file.type }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to get upload URL')
      const { signedUrl, projectId, uploadId } = await res.json()

      // 3. Upload directly to Supabase Storage with progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
        }
        xhr.onload = () => (xhr.status === 200 || xhr.status === 204 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      // 4. Confirm upload so audio_uploads row is marked completed
      await fetch('/api/upload/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId }),
      })

      setProgress(100)
      setPhase('done')

      // 5. Redirect to processing page
      setTimeout(() => router.push(`/projects/${projectId}`), 600)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setPhase('error')
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      {/* Drop zone area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setPhase('dragging') }}
        onDragLeave={() => setPhase(file ? 'selected' : 'idle')}
        onDrop={onDrop}
        className={clsx(
          'relative rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200',
          {
            'border-border bg-surface hover:border-violet-700/60 hover:bg-surface-raised cursor-pointer': phase === 'idle',
            'border-violet-500 bg-violet-950/30 scale-[1.01]': phase === 'dragging',
            'border-border bg-surface': phase === 'selected',
            'border-violet-600/40 bg-surface': phase === 'uploading',
            'border-emerald-700/40 bg-emerald-950/20': phase === 'done',
            'border-red-700/40 bg-red-950/20': phase === 'error',
          }
        )}
      >
        {/* Hidden file input */}
        <input
          type="file"
          accept=".mp3,.wav,.m4a,.flac,audio/*"
          className="absolute inset-0 opacity-0 cursor-pointer"
          onChange={onInputChange}
          disabled={phase === 'uploading' || phase === 'done'}
        />

        {/* Icon */}
        <div className="mb-4 flex justify-center">
          {phase === 'done' ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-400" />
          ) : phase === 'error' ? (
            <AlertCircle className="h-12 w-12 text-red-400" />
          ) : file ? (
            <FileAudio className="h-12 w-12 text-violet-400" />
          ) : (
            <div className={clsx(
              'flex h-16 w-16 items-center justify-center rounded-2xl transition-all',
              phase === 'dragging' ? 'bg-violet-600/30 scale-110' : 'bg-surface-overlay'
            )}>
              <Upload className={clsx('h-7 w-7', phase === 'dragging' ? 'text-violet-300' : 'text-slate-500')} />
            </div>
          )}
        </div>

        {/* Text */}
        {phase === 'idle' && (
          <>
            <p className="mb-1 font-medium text-slate-200">Drop your audio file here</p>
            <p className="text-sm text-slate-500">or click to browse</p>
            <p className="mt-3 text-xs text-slate-600">MP3 · WAV · M4A · FLAC · up to 50 MB</p>
          </>
        )}

        {phase === 'dragging' && (
          <p className="font-semibold text-violet-300 text-lg">Release to upload</p>
        )}

        {(phase === 'selected' || phase === 'uploading') && file && (
          <div className="space-y-1">
            <p className="font-medium text-slate-200 truncate max-w-xs mx-auto">{file.name}</p>
            <p className="text-sm text-slate-500">{formatBytes(file.size)} · {file.type.split('/')[1].toUpperCase()}</p>
          </div>
        )}

        {phase === 'done' && (
          <p className="font-medium text-emerald-400">Upload complete! Redirecting…</p>
        )}

        {phase === 'error' && (
          <p className="font-medium text-red-400">Upload failed</p>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {/* Progress bar */}
      {phase === 'uploading' && (
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs text-slate-500">
            <span>Uploading…</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-overlay overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-600 to-indigo-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      {phase === 'selected' && file && (
        <div className="mt-4 flex gap-3">
          <Button variant="secondary" size="sm" onClick={reset} className="gap-1.5">
            <X className="h-3.5 w-3.5" /> Remove
          </Button>
          <Button onClick={handleUpload} className="flex-1">
            Upload &amp; Transcribe
          </Button>
        </div>
      )}

      {phase === 'error' && (
        <Button variant="secondary" size="sm" onClick={reset} className="mt-4">
          Try again
        </Button>
      )}
    </div>
  )
}
