'use client'

import { useState } from 'react'
import { Volume2, VolumeX, FileMusic, Music, Mic, Guitar, Piano } from 'lucide-react'
import { clsx } from 'clsx'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { JobStatus } from './ProcessingTimeline'

export type StemType = 'vocals' | 'piano' | 'guitar' | 'bass' | 'drums'

interface Stem {
  type: StemType
  label: string
  icon: React.ElementType
  color: string
}

const STEMS: Stem[] = [
  { type: 'vocals', label: 'Vocals',  icon: Mic,      color: 'text-pink-400' },
  { type: 'piano',  label: 'Piano',   icon: Piano,    color: 'text-sky-400' },
  { type: 'guitar', label: 'Guitar',  icon: Guitar,   color: 'text-amber-400' },
  { type: 'bass',   label: 'Bass',    icon: Music,    color: 'text-emerald-400' },
  { type: 'drums',  label: 'Drums',   icon: FileMusic, color: 'text-orange-400' },
]

interface StemListProps {
  jobStatus: JobStatus
}

export function StemList({ jobStatus }: StemListProps) {
  const [muted, setMuted] = useState<Set<StemType>>(new Set())
  const isReady = jobStatus === 'completed'
  const isProcessing = !isReady && jobStatus !== 'failed'

  function toggleMute(type: StemType) {
    setMuted((prev) => {
      const next = new Set(prev)
      next.has(type) ? next.delete(type) : next.add(type)
      return next
    })
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-slate-500">
        Detected stems
      </h2>

      <ul className="space-y-3">
        {STEMS.map(({ type, label, icon: Icon, color }) => {
          const isMuted = muted.has(type)
          return (
            <li
              key={type}
              className={clsx(
                'flex items-center gap-4 rounded-xl border p-3 transition-all',
                isReady
                  ? 'border-border bg-surface-raised hover:border-slate-700'
                  : 'border-border/50 bg-surface-raised/50'
              )}
            >
              {/* Icon */}
              <div className={clsx(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                isReady ? 'bg-surface-overlay' : 'bg-surface-overlay/50'
              )}>
                <Icon className={clsx('h-4 w-4', isReady ? color : 'text-slate-600')} />
              </div>

              {/* Label + status */}
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-medium', isReady ? 'text-slate-200' : 'text-slate-500')}>
                  {label}
                </p>
                <div className="mt-0.5">
                  {isReady ? (
                    <Badge variant="success" dot>Separated</Badge>
                  ) : isProcessing ? (
                    <Badge variant="purple" dot>Pending</Badge>
                  ) : (
                    <Badge variant="error">Failed</Badge>
                  )}
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                <button
                  disabled={!isReady}
                  onClick={() => toggleMute(type)}
                  title={isMuted ? 'Unmute' : 'Mute'}
                  className={clsx(
                    'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                    isReady
                      ? isMuted
                        ? 'bg-red-950/50 text-red-400 hover:bg-red-950'
                        : 'bg-surface-overlay text-slate-400 hover:text-slate-200 hover:bg-surface-overlay/80'
                      : 'opacity-30 cursor-not-allowed bg-surface-overlay text-slate-600'
                  )}
                >
                  {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                </button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!isReady}
                  className="text-xs"
                >
                  <FileMusic className="h-3 w-3" />
                  View Notes
                </Button>
              </div>
            </li>
          )
        })}
      </ul>

      {!isReady && (
        <p className="mt-4 text-center text-xs text-slate-600">
          Stems will appear once processing is complete.
        </p>
      )}
    </div>
  )
}
