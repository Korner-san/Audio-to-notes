function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function optionalEnv(name: string, fallback = ''): string {
  return process.env[name] ?? fallback
}

export const env = {
  supabase: {
    url: requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    publishableKey: requireEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    // server-only
    get serviceRoleKey() {
      return requireEnv('SUPABASE_SERVICE_ROLE_KEY')
    },
  },
  storage: {
    audio: optionalEnv('STORAGE_BUCKET_AUDIO', 'audio-raw'),
    stems: optionalEnv('STORAGE_BUCKET_STEMS', 'audio-stems'),
    midi: optionalEnv('STORAGE_BUCKET_MIDI', 'midi-files'),
    musicxml: optionalEnv('STORAGE_BUCKET_MUSICXML', 'musicxml-files'),
    exports: optionalEnv('STORAGE_BUCKET_EXPORTS', 'exports'),
  },
  audioshake: {
    apiKey: optionalEnv('AUDIOSHAKE_API_KEY'),
  },
  features: {
    useAudioshake: optionalEnv('FEATURE_USE_AUDIOSHAKE', 'false') === 'true',
    noteEditor: optionalEnv('FEATURE_NOTE_EDITOR', 'true') === 'true',
    pdfExport: optionalEnv('FEATURE_PDF_EXPORT', 'false') === 'true',
    billing: optionalEnv('FEATURE_BILLING', 'false') === 'true',
  },
} as const
