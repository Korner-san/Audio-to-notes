import { Download, FileMusic, Music, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { JobStatus } from './ProcessingTimeline'

interface ExportPanelProps {
  jobStatus: JobStatus
}

export function ExportPanel({ jobStatus }: ExportPanelProps) {
  const isReady = jobStatus === 'completed'

  const exports = [
    { icon: Music,     label: 'MIDI',     desc: 'For DAWs and music software', ext: '.mid' },
    { icon: FileMusic, label: 'MusicXML', desc: 'For notation software',        ext: '.xml' },
    { icon: FileText,  label: 'PDF',      desc: 'For printing and sharing',     ext: '.pdf' },
  ]

  return (
    <div className="rounded-2xl border border-border bg-surface p-6">
      <div className="mb-5 flex items-center gap-2">
        <Download className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Export
        </h2>
      </div>

      <div className="space-y-3">
        {exports.map(({ icon: Icon, label, desc, ext }) => (
          <div
            key={label}
            className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-3"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-overlay">
              <Icon className="h-4 w-4 text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-300">{label}</p>
              <p className="text-xs text-slate-500">{desc} · <span className="font-mono">{ext}</span></p>
            </div>
            <Button variant="secondary" size="sm" disabled={!isReady}>
              Download
            </Button>
          </div>
        ))}
      </div>

      {!isReady && (
        <p className="mt-4 text-center text-xs text-slate-600">
          Export available once processing completes.
        </p>
      )}
    </div>
  )
}
