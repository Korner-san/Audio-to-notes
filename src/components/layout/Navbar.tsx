import Link from 'next/link'
import { Music2 } from 'lucide-react'

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-[#09090f]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 shadow-lg shadow-violet-900/40 group-hover:bg-violet-500 transition-colors">
            <Music2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-slate-100 tracking-tight">
            Audio<span className="text-violet-400">to</span>Notes
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-surface-raised transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/upload"
            className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
          >
            Upload Audio
          </Link>
        </nav>
      </div>
    </header>
  )
}
