import { useState } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { AVATARS, Avatar } from '@/components/ui'
import { useToast, errMessage } from '@/components/Toast'
import type { PlayerMode } from '@/lib/types'

export default function Login() {
  const { login } = usePlayer()
  const toast = useToast()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [mode, setMode] = useState<PlayerMode>('economy')
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim()) {
      toast.error('Enter a name first')
      return
    }
    setBusy(true)
    try {
      await login(name, avatar, mode, showAdmin ? adminCode : undefined)
    } catch (e) {
      toast.error(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 py-10 safe-top safe-bottom">
      <header className="mb-7 text-center">
        <div className="mb-2 text-5xl">♠️</div>
        <h1 className="text-4xl text-gold-300">Casino Night</h1>
        <p className="mt-1 text-sm tracking-[0.3em] text-gold-500/80">EST. TONIGHT</p>
        <p className="mt-4 inline-block rounded-full border border-gold-500/30 bg-felt-800/60 px-4 py-1.5 text-xs text-bone/80">
          🎉 Pretend chips only — no real money, no real value
        </p>
      </header>

      <div className="deco-card p-5">
        <label className="label">Your name</label>
        <input
          className="input mt-1.5"
          placeholder="e.g. Anna"
          value={name}
          maxLength={20}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        <label className="label mt-5 block">Pick an avatar</label>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              key={a}
              onClick={() => setAvatar(a)}
              className={[
                'flex h-11 items-center justify-center rounded-lg border text-xl transition',
                a === avatar
                  ? 'border-gold-500 bg-felt-600 shadow-gold'
                  : 'border-gold-500/15 bg-felt-900/50',
              ].join(' ')}
            >
              {a}
            </button>
          ))}
        </div>

        <label className="label mt-5 block">How do you want to play?</label>
        <div className="mt-2 grid grid-cols-1 gap-2">
          <ModeOption
            selected={mode === 'economy'}
            onClick={() => setMode('economy')}
            emoji="💰"
            title="Full game"
            tag="Economy"
            line="Start with 1000 chips — bet on games, send chips, do quests, climb the leaderboard."
          />
          <ModeOption
            selected={mode === 'casual'}
            onClick={() => setMode('casual')}
            emoji="🎈"
            title="Just here to play"
            tag="Casual"
            line="No chips to keep track of. Play the games for fun and grab drinks for free."
          />
        </div>

        <button className="btn-gold mt-6 w-full" onClick={submit} disabled={busy}>
          {busy ? 'Dealing you in…' : 'Join the party'}
        </button>

        <button
          className="mt-3 w-full text-center text-xs tracking-widest text-bone/30"
          onClick={() => setShowAdmin((s) => !s)}
        >
          {showAdmin ? '— hide host options —' : '·'}
        </button>
        {showAdmin && (
          <div className="mt-1">
            <label className="label">Host code (optional)</label>
            <input
              className="input mt-1.5"
              placeholder="Enter host code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
            />
            <p className="mt-1.5 text-xs text-bone/60">
              Turns this device into a host (run tables, fulfil drinks, grant chips).
            </p>
          </div>
        )}
      </div>

      <p className="mt-6 px-4 text-center text-xs leading-relaxed text-bone/60">
        Chips are just for fun tonight — no real money, no real value. You can switch between
        Economy and Casual anytime from settings.
      </p>
    </div>
  )
}

function ModeOption({
  selected,
  onClick,
  emoji,
  title,
  tag,
  line,
}: {
  selected: boolean
  onClick: () => void
  emoji: string
  title: string
  tag: string
  line: string
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'flex items-start gap-3 rounded-xl border p-3 text-left transition',
        selected ? 'border-gold-500 bg-felt-600/60 shadow-gold' : 'border-gold-500/15 bg-felt-900/40',
      ].join(' ')}
    >
      <Avatar emoji={emoji} />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-lg text-bone">{title}</span>
          <span className="rounded-full border border-gold-500/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold-300/70">
            {tag}
          </span>
          {selected && <span className="ml-auto text-gold-400">✓</span>}
        </div>
        <p className="text-sm leading-snug text-bone/55">{line}</p>
      </div>
    </button>
  )
}
