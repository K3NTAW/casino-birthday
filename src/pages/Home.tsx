import { Link, useNavigate } from 'react-router-dom'
import type { ComponentType } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { useSettings } from '@/lib/queries'
import { useActivityFeed } from '@/lib/activity'
import { Avatar, ChipCount, Pill, SectionTitle } from '@/components/ui'
import { ActivityList } from '@/components/ActivityList'
import { PlayerQR } from '@/components/QR'
import {
  IconChevronRight,
  IconCrown,
  IconDice,
  IconKey,
  IconSend,
  IconSettings,
  IconShield,
  IconWine,
  type IconProps,
} from '@/components/icons'

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
        <Link to="/settings" className="icon-btn" aria-label="Settings">
          <IconSettings className="h-5 w-5" />
        </Link>
      </header>

      {economy ? (
        <>
          {/* Balance — the hero element. Tap to see where the chips went. */}
          <Link
            to="/activity"
            className="deco-card-hero group relative block overflow-hidden p-7 text-center transition duration-200 ease-out-quart active:scale-[0.99]"
          >
            {/* Slow gold sheen sweeping across the felt. */}
            <div className="pointer-events-none absolute inset-0 animate-sheen bg-gold-sheen bg-[length:200%_100%]" />
            <p className="label relative">Your chips</p>
            <div className="relative mt-3 flex items-center justify-center gap-3">
              <span aria-hidden className="text-xl text-gold-500/55">◈</span>
              <ChipCount value={player.balance} className="text-6xl leading-none text-gold-300" />
              <span aria-hidden className="text-xl text-gold-500/55">◈</span>
            </div>
            {player.parked_balance > 0 && (
              <p className="relative mt-2 text-xs text-bone/60">
                {player.parked_balance.toLocaleString()} parked (casual mode)
              </p>
            )}
            <p className="relative mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-gold-300/80">
              View activity
              <IconChevronRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5" />
            </p>
          </Link>

          {/* QR + player code */}
          <section className="deco-card flex flex-col items-center p-5">
            <p className="label mb-3">Receive chips — show this</p>
            <PlayerQR value={player.id} />
            <div className="mt-4 text-center">
              <p className="font-display text-3xl tracking-[0.3em] text-gold-300">
                {player.player_code}
              </p>
              <p className="mt-0.5 text-xs text-bone/60">your player code</p>
            </div>
          </section>

          {/* Quick actions */}
          <section className="grid grid-cols-2 gap-3">
            <QuickAction to="/send" Icon={IconSend} label="Send chips" />
            <QuickAction to="/games" Icon={IconDice} label="Play games" />
            <QuickAction to="/quests" Icon={IconKey} label="Quests" />
            <QuickAction to="/shop" Icon={IconWine} label="Shop" />
            {settings?.leaderboard_visible && (
              <QuickAction to="/leaderboard" Icon={IconCrown} label="Leaderboard" />
            )}
            {isAdmin && <QuickAction to="/admin" Icon={IconShield} label="Host panel" />}
          </section>

          {/* Recent activity — who/what your chips came from and went to */}
          {rows.length > 0 && (
            <section>
              <SectionTitle
                right={
                  <Link
                    to="/activity"
                    className="inline-flex items-center gap-0.5 text-sm font-semibold text-gold-300/80"
                  >
                    See all
                    <IconChevronRight className="h-3.5 w-3.5" />
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
          <section className="deco-card-hero relative overflow-hidden p-7 text-center">
            <div className="pointer-events-none absolute inset-0 animate-sheen bg-gold-sheen bg-[length:200%_100%]" />
            <div className="relative text-4xl">🎈</div>
            <h2 className="relative mt-2 text-2xl text-gold-300">You're here to play</h2>
            <p className="relative mx-auto mt-1 max-w-xs text-sm text-bone/70">
              No chips to track. Jump into a game or grab a drink — it's all on the house.
            </p>
          </section>
          <section className="grid grid-cols-2 gap-3">
            <QuickAction to="/games" Icon={IconDice} label="Play games" />
            <QuickAction to="/shop" Icon={IconWine} label="Free bar" />
          </section>
          <button className="btn-ghost w-full" onClick={() => nav('/settings')}>
            Want chips? Switch to Economy →
          </button>
          {isAdmin && <QuickAction to="/admin" Icon={IconShield} label="Host panel" />}
        </>
      )}
    </div>
  )
}

function QuickAction({
  to,
  Icon,
  label,
}: {
  to: string
  Icon: ComponentType<IconProps>
  label: string
}) {
  return (
    <Link
      to={to}
      className="deco-card group flex items-center gap-3 p-4 transition duration-200 ease-out-quart hover:border-gold-500/30 active:scale-[0.98]"
    >
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold-500/20 bg-felt-700/60 text-gold-300 shadow-rim"
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex-1 font-semibold text-bone">{label}</span>
      <IconChevronRight className="h-4 w-4 text-gold-500/40 transition-transform duration-200 ease-out-quart group-hover:translate-x-0.5" />
    </Link>
  )
}
