import { DropZone } from '@/components/upload/DropZone'
import { FileAudio, Shield, Zap } from 'lucide-react'

export const metadata = { title: 'Upload Audio — AudiotoNotes' }

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      {/* Header */}
      <div className="mb-10 text-center">
        <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-900/40 text-violet-400">
          <FileAudio className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-3xl font-bold text-white">Upload Audio</h1>
        <p className="text-slate-400">
          Your audio will be separated into stems, transcribed to MIDI, and converted to editable sheet music.
        </p>
      </div>

      <DropZone />

      {/* Trust signals */}
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { icon: Shield, label: 'Private by default', desc: 'Your files are never shared' },
          { icon: Zap, label: 'Fast processing', desc: 'Results in 2–3 minutes' },
          { icon: FileAudio, label: 'High fidelity', desc: 'AI-powered stem separation' },
        ].map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-4">
            <Icon className="mb-2 h-4 w-4 text-violet-400" />
            <p className="text-xs font-medium text-slate-200">{label}</p>
            <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
