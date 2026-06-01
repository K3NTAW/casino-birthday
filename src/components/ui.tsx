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
      className={`inline-flex shrink-0 items-center justify-center rounded-full border border-gold-500/30 bg-gradient-to-b from-felt-600 to-felt-800 shadow-rim ${cls}`}
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
    // Honor reduced-motion: land on the value instantly, skip the count-up tween.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(value)
      return
    }
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
      <div className="relative h-9 w-9">
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-gold-500/15 border-t-gold-400" />
        <div className="absolute inset-1.5 rounded-full bg-gold-500/10 blur-[2px]" />
      </div>
    </div>
  )
}

export function EmptyState({ emoji, title, sub }: { emoji: string; title: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full border border-gold-500/20 bg-felt-800/60 text-3xl shadow-rim">
        {emoji}
      </div>
      <p className="font-display text-xl text-bone/90">{title}</p>
      {sub && <p className="max-w-xs text-sm text-bone/70">{sub}</p>}
    </div>
  )
}

export function Pill({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'jade' | 'ruby' | 'muted' }) {
  const tones = {
    gold: 'border-gold-500/40 bg-gold-500/10 text-gold-300',
    jade: 'border-jade/50 bg-jade/10 text-jade',
    ruby: 'border-ruby/60 bg-ruby/10 text-ruby',
    muted: 'border-bone/20 bg-bone/5 text-bone/70',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="flex items-center gap-2 text-xl text-gold-300">
        <span aria-hidden className="text-gold-500/50">◈</span>
        {children}
      </h2>
      {right}
    </div>
  )
}
