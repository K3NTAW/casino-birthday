import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'win' | 'info' | 'error'
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastApi {
  win: (message: string) => void
  info: (message: string) => void
  error: (message: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

let counter = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++counter
    setToasts((t) => [...t, { id, kind, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'error' ? 4200 : 2800)
  }, [])

  const api: ToastApi = {
    win: (m) => push('win', m),
    info: (m) => push('info', m),
    error: (m) => push('error', m),
  }

  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-4 pt-3 safe-top">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              'animate-chip-pop pointer-events-auto w-full max-w-sm rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow-deco backdrop-blur',
              t.kind === 'win'
                ? 'border-gold-500/50 bg-felt-700/90 text-gold-300'
                : t.kind === 'error'
                  ? 'border-ruby/60 bg-felt-800/95 text-bone'
                  : 'border-gold-500/25 bg-felt-800/95 text-bone',
            ].join(' ')}
          >
            {t.kind === 'win' && <span className="mr-1">✨</span>}
            {t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v
}

/** Pull a human-readable message out of a Supabase/PG error. */
export function errMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e)
  // Strip our "category: " prefixes from RAISE for friendlier copy.
  return raw.replace(/^(auth|amount|name):\s*/i, '').replace(/^ERROR:\s*/i, '')
}
