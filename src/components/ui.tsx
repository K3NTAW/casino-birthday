import { useEffect, useRef, useState, type ReactNode } from 'react'

export const AVATARS = [
  '🎲', '🃏', '♠️', '♥️', '♦️', '♣️', '🎰', '💎', '🥂', '🍸',
  '👑', '🦊', '🐺', '🦁', '🐲', '🦄', '🚀', '⭐', '🔥', '🎭',
]

export function Avatar({ emoji, size = 'md' }: { emoji: string; size?: 'sm' | 'md' | 'lg' }) {
  const cls =
    size === 'lg' ? 'h-16 w-16 text-3xl' : size === 'sm' ? 'h-8 w-8 text-base' : 'h-11 w-11 text-xl'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-felt-700 ${cls}`}
    >
      {emoji}
    </span>
  )
}

/** Animated chip counter — flashes gold when the value rises (a win). */
export function ChipCount({ value, className = '' }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(value)
  const prev = useRef(value)

  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (from === value) return
    const start = performance.now()
    const dur = 500
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])

  const rising = value > prev.current
  return (
    <span className={`chip-amount tabular-nums ${rising ? 'animate-count-flash' : ''} ${className}`}>
      {display.toLocaleString()}
    </span>
  )
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500/30 border-t-gold-500" />
    </div>
  )
}

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <div className="text-4xl opacity-70">{emoji}</div>
      <p className="text-lg text-bone/80">{title}</p>
      {sub && <p className="max-w-xs text-sm text-bone/50">{sub}</p>}
    </div>
  )
}

export function Pill({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'jade' | 'ruby' | 'muted' }) {
  const tones = {
    gold: 'border-gold-500/40 text-gold-300',
    jade: 'border-jade/50 text-jade',
    ruby: 'border-ruby/60 text-ruby',
    muted: 'border-bone/20 text-bone/60',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-xl text-gold-300">{children}</h2>
      {right}
    </div>
  )
}
