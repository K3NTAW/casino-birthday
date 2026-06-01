import { Link, useNavigate } from 'react-router-dom'
import { usePlayer } from '@/context/PlayerContext'
import { useSettings } from '@/lib/queries'
import { useActivityFeed } from '@/lib/activity'
import { Avatar, ChipCount, Pill, SectionTitle } from '@/components/ui'
import { ActivityList } from '@/components/ActivityList'
import { PlayerQR } from '@/components/QR'

export default function Home() {
  const { player, isAdmin } = usePlayer()
  const { data: settings } = useSettings()
  const { rows } = useActivityFeed(player?.id ?? '')
  const nav = useNavigate()
  if (!player) return null

  const economy = player.mode === 'economy'

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3">
          <Avatar emoji={player.avatar} size="md" />
          <div>
            <p className="font-display text-lg leading-tight text-bone">{player.display_name}</p>
            <Pill tone={economy ? 'gold' : 'muted'}>{economy ? 'Economy' : 'Casual'}</Pill>
          </div>
        </div>
        <Link to="/settings" className="btn-ghost px-3 py-2 text-sm">
          ⚙︎
        </Link>
      </header>

      {economy ? (
        <>
          {/* Balance — the hero element. Tap to see where the chips went. */}
          <Link to="/activity" className="deco-card relative block overflow-hidden p-6 text-center transition active:scale-[0.99]">
            <div className="pointer-events-none absolute inset-0 animate-shimmer bg-[linear-gradient(110deg,transparent_30%,rgba(212,175,55,0.06)_50%,transparent_70%)] bg-[length:200%_100%]" />
            <p className="label">Your chips</p>
            <div className="mt-1 flex items-baseline justify-center gap-2">
              <span className="text-2xl text-gold-500">◈</span>
              <ChipCount value={player.balance} className="text-6xl text-gold-300" />
            </div>
            {player.parked_balance > 0 && (
              <p className="mt-2 text-xs text-bone/60">
                {player.parked_balance.toLocaleString()} parked (casual mode)
              </p>
            )}
            <p className="mt-3 text-xs font-semibold tracking-wide text-gold-300/80">View activity →</p>
          </Link>

          {/* QR + player code */}
          <section className="deco-card flex flex-col items-center p-5">
            <p className="label mb-3">Receive chips — show this</p>
            <PlayerQR value={player.id} />
            <div className="mt-3 text-center">
              <p className="font-display text-3xl tracking-[0.3em] text-gold-300">
                {player.player_code}
              </p>
              <p className="text-xs text-bone/60">your player code</p>
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-3">
            <QuickAction to="/send" emoji="➤" label="Send chips" />
            <QuickAction to="/games" emoji="🎲" label="Play games" />
            <QuickAction to="/quests" emoji="🗝️" label="Quests" />
            <QuickAction to="/shop" emoji="🍸" label="Shop" />
            {settings?.leaderboard_visible && (
              <QuickAction to="/leaderboard" emoji="👑" label="Leaderboard" />
            )}
            {isAdmin && <QuickAction to="/admin" emoji="⚙️" label="Host panel" />}
          </section>

          {/* Recent activity — who/what your chips came from and went to */}
          {rows.length > 0 && (
            <section>
              <SectionTitle
                right={
                  <Link to="/activity" className="text-sm font-semibold text-gold-300/80">
                    See all ›
                  </Link>
                }
              >
                Recent activity
              </SectionTitle>
              <ActivityList rows={rows.slice(0, 4)} />
            </section>
          )}
        </>
      ) : (
        <>
          {/* Casual home — no balance, no chrome */}
          <section className="deco-card p-6 text-center">
            <div className="text-4xl">🎈</div>
            <h2 className="mt-2 text-2xl text-gold-300">You're here to play</h2>
            <p className="mt-1 text-sm text-bone/55">
              No chips to track. Jump into a game or grab a drink — it's all on the house.
            </p>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <QuickAction to="/games" emoji="🎲" label="Play games" />
            <QuickAction to="/shop" emoji="🍸" label="Free bar" />
          </section>
          <button
            className="btn-ghost w-full"
            onClick={() => nav('/settings')}
          >
            Want chips? Switch to Economy →
          </button>
          {isAdmin && (
            <QuickAction to="/admin" emoji="⚙️" label="Host panel" />
          )}
        </>
      )}
    </div>
  )
}

function QuickAction({ to, emoji, label }: { to: string; emoji: string; label: string }) {
  return (
    <Link
      to={to}
      className="deco-card flex items-center gap-3 p-4 transition active:scale-[0.98]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="font-semibold text-bone">{label}</span>
    </Link>
  )
}
