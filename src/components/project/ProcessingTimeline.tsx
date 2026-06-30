'use client'

import { clsx } from 'clsx'
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react'

export type JobStatus = 'uploaded' | 'separating' | 'transcribing' | 'generating_score' | 'completed' | 'failed'

const STEPS: { key: JobStatus; label: string; desc: string }[] = [
  { key: 'uploaded',         label: 'Uploaded',          desc: 'Audio received and queued' },
  { key: 'separating',       label: 'Separating stems',  desc: 'AI isolating instruments' },
  { key: 'transcribing',     label: 'Transcribing notes', desc: 'Converting audio to MIDI' },
  { key: 'generating_score', label: 'Generating score',  desc: 'Building MusicXML and sheet music' },
  { key: 'completed',        label: 'Ready',             desc: 'Your score is ready to view' },
]

const ORDER: JobStatus[] = ['uploaded', 'separating', 'transcribing', 'generating_score', 'completed']

function stepIndex(status: JobStatus) {
  const i = ORDER.indexOf(status)
  return i === -1 ? 0 : i
}

function StepIcon({ state }: { state: 'done' | 'active' | 'pending' | 'failed' }) {
  if (state === 'done') return <CheckCircle2 className="h-5 w-5 text-emerald-400" />
  if (state === 'active') return <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
  if (state === 'failed') return <XCircle className="h-5 w-5 text-red-400" />
  return <Circle className="h-5 w-5 text-slate-700" />
}

interface ProcessingTimelineProps {
  status: JobStatus
}

export function ProcessingTimeline({ status }: ProcessingTimelineProps) {
  const currentIdx = stepIndex(status)
  const isFailed = status === 'failed'

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Processing status
      </h2>

      <ol className="space-y-0">
        {STEPS.map((step, i) => {
          const state =
            isFailed && i === currentIdx ? 'failed'
            : i < currentIdx || (status === 'completed' && i === currentIdx) ? 'done'
            : i === currentIdx ? 'active'
            : 'pending'

          const isLast = i === STEPS.length - 1

          return (
            <li key={step.key} className="flex gap-4">
              {/* Connector column */}
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised">
                  <StepIcon state={state} />
                </div>
                {!isLast && (
                  <div className={clsx(
                    'mt-1 mb-1 w-px flex-1',
                    i < currentIdx ? 'bg-emerald-800/60' : 'bg-border'
                  )} />
                )}
              </div>

              {/* Content */}
              <div className={clsx('pb-6', isLast && 'pb-0')}>
                <p className={clsx(
                  'text-sm font-medium leading-8',
                  state === 'done' ? 'text-slate-300' :
                  state === 'active' ? 'text-violet-300' :
                  state === 'failed' ? 'text-red-400' :
                  'text-slate-600'
                )}>
                  {step.label}
                  {state === 'active' && (
                    <span className="ml-2 inline-block text-xs text-violet-500 animate-pulse">in progress…</span>
                  )}
                </p>
                {(state === 'done' || state === 'active') && (
                  <p className="text-xs text-slate-500">{step.desc}</p>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {isFailed && (
        <div className="mt-4 rounded-lg border border-red-800/40 bg-red-950/30 px-4 py-3 text-sm text-red-400">
          Processing failed. Please try re-uploading your file.
        </div>
      )}
    </div>
  )
}
