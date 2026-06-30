import Link from 'next/link'
import { Music2, AudioLines, FileMusic, Download, ArrowRight, Zap } from 'lucide-react'

const features = [
  { icon: AudioLines, title: 'Stem Separation', desc: 'AI isolates vocals, piano, guitar, bass, and drums from any mix.' },
  { icon: Music2, title: 'MIDI Transcription', desc: 'Each stem is converted to precise MIDI with timing and velocity.' },
  { icon: FileMusic, title: 'Score Generation', desc: 'MIDI becomes editable MusicXML rendered as interactive sheet music.' },
  { icon: Download, title: 'Export Anywhere', desc: 'Download MIDI, MusicXML, or PDF for DAWs, notation software, and printing.' },
]

export default function HomePage() {
  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-indigo-600/8 blur-[100px]" />
      </div>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-4 pt-24 pb-20 text-center sm:px-6 sm:pt-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-800/40 bg-violet-950/40 px-4 py-1.5 text-sm text-violet-300">
          <Zap className="h-3.5 w-3.5" />
          AI-powered music transcription
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
          Turn audio into{' '}
          <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            sheet music
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-xl text-lg text-slate-400 leading-relaxed">
          Upload any audio file. Our AI separates the instruments, transcribes each to MIDI,
          and generates editable scores you can export anywhere.
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/upload"
            className="group inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 transition-all hover:shadow-violet-900/60"
          >
            Upload Audio
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="#how-it-works"
            className="inline-flex items-center gap-2 rounded-xl border border-border px-8 py-3.5 text-base font-medium text-slate-300 hover:text-white hover:border-slate-600 transition-all"
          >
            How it works
          </Link>
        </div>

        {/* Pill stats */}
        <div className="mt-14 flex flex-wrap justify-center gap-6 text-sm text-slate-500">
          {['mp3 · wav · m4a · flac', 'Up to 50 MB', 'Vocals, Piano, Guitar, Bass, Drums'].map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-violet-600" />
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 pb-24 sm:px-6">
        <div className="mb-12 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">How it works</h2>
          <p className="mt-2 text-slate-500">Four steps from audio file to printed score</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-border bg-surface p-6 transition-all hover:border-violet-800/60 hover:bg-surface-raised"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-900/40 text-violet-400 group-hover:bg-violet-900/70 transition-colors">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-mono text-slate-600">0{i + 1}</span>
              </div>
              <h3 className="mb-2 font-semibold text-slate-100">{title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bar */}
      <section className="mx-auto max-w-4xl px-4 pb-24 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-violet-800/30 bg-gradient-to-br from-violet-950/60 to-indigo-950/60 p-10 text-center">
          <div className="absolute inset-0 -z-10 bg-gradient-to-br from-violet-600/5 to-transparent" />
          <h2 className="mb-3 text-2xl font-bold text-white">Ready to transcribe?</h2>
          <p className="mb-6 text-slate-400">Drop your first file and see the magic.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-base font-semibold text-white hover:bg-violet-500 transition-colors"
          >
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
