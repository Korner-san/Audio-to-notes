import type { Metadata } from 'next'
import './globals.css'
import { Navbar } from '@/components/layout/Navbar'

export const metadata: Metadata = {
  title: 'AudiotoNotes — Turn audio into sheet music',
  description: 'Upload audio, separate instruments, generate editable notes and scores.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#09090f] text-slate-100 antialiased">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  )
}
