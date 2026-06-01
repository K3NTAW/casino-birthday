import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // Surface misconfiguration loudly rather than failing mysteriously later.
  // eslint-disable-next-line no-console
  console.error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local.',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: { persistSession: false },
  realtime: { params: { eventsPerSecond: 10 } },
})

// NOTE: the admin code is intentionally NOT read into the client bundle.
// The host types it at runtime and it is verified server-side in claim_admin
// against the private app_secrets table — so it never ships to guests' phones.
