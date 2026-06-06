import { useState } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { AVATARS, Avatar } from '@/components/ui'
import { useToast, errMessage } from '@/components/Toast'
import type { PlayerMode } from '@/lib/types'

export default function Login() {
  const { login, reclaim } = usePlayer()
  const toast = useToast()
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [mode, setMode] = useState<PlayerMode>('economy')
  const [showAdmin, setShowAdmin] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [view, setView] = useState<'join' | 'reclaim'>('join')
  const [reName, setReName] = useState('')
  const [reCode, setReCode] = useState('')

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

  const submitReclaim = async () => {
    if (!reName.trim() || !reCode.trim()) {
      toast.error('Enter your name and 4-char code')
      return
    }
    setBusy(true)
    try {
      await reclaim(reCode, reName)
      toast.win('Welcome back!')
    } catch (e) {
      toast.error(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center px-5 pt-[max(2.5rem,env(safe-area-inset-top))] pb-[max(2.5rem,env(safe-area-inset-bottom))] stagger">
      <header className="mb-8 text-center">
        <div className="mb-2 text-5xl drop-shadow-[0_0_18px_rgba(212,175,55,0.4)]">♠️</div>
        <h1 className="font-display text-5xl leading-none text-gold-300">Casino Night</h1>
        <div className="deco-rule mx-auto mt-3 max-w-[14rem]">
          <span className="text-[11px] uppercase tracking-[0.35em]">Est. Tonight</span>
        </div>
        <p className="mt-5 inline-block rounded-full border border-gold-500/30 bg-felt-800/60 px-4 py-1.5 text-xs text-bone/80 shadow-rim">
          🎉 Pretend chips only — no real money, no real value
        </p>
      </header>

      {view === 'join' && (
      <div className="deco-card-hero p-5">
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
      )}

      {view === 'reclaim' && (
        <div className="deco-card-hero p-5">
          <h2 className="font-display text-2xl text-gold-300">Get back in</h2>
          <p className="mt-1 text-sm leading-snug text-bone/70">
            Lost your login? Enter the name you joined with and the 4-char player code from your
            Home screen.
          </p>

          <label className="label mt-5 block">Your name</label>
          <input
            className="input mt-1.5"
            placeholder="The name you joined with"
            value={reName}
            maxLength={20}
            onChange={(e) => setReName(e.target.value)}
            autoFocus
          />

          <label className="label mt-4 block">Your player code</label>
          <input
            className="input mt-1.5 text-center font-display text-2xl tracking-[0.3em]"
            placeholder="ABCD"
            value={reCode}
            maxLength={4}
            inputMode="text"
            autoCapitalize="characters"
            onChange={(e) => setReCode(e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase())}
          />

          <button className="btn-gold mt-6 w-full" onClick={submitReclaim} disabled={busy}>
            {busy ? 'Finding you…' : 'Get back in'}
          </button>
        </div>
      )}

      <button
        className="mt-4 w-full text-center text-sm font-semibold text-bone/70 transition hover:text-gold-300"
        onClick={() => setView((v) => (v === 'join' ? 'reclaim' : 'join'))}
      >
        {view === 'join' ? 'Already played tonight? Get back in →' : '← New here? Join the party'}
      </button>

      {view === 'join' && (
        <p className="mt-6 px-4 text-center text-xs leading-relaxed text-bone/60">
          Chips are just for fun tonight — no real money, no real value. You can switch between
          Economy and Casual anytime from settings.
        </p>
      )}
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
        <p className="text-sm leading-snug text-bone/70">{line}</p>
      </div>
    </button>
  )
}
