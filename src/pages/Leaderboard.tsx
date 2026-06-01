import { useMemo } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { usePlayers, useRealtime, keys } from '@/lib/queries'
import { Avatar, ChipCount, Spinner } from '@/components/ui'

export default function Leaderboard() {
  const { player } = usePlayer()
  const { data: players, isLoading } = usePlayers()

  useRealtime(['players'], (c) => void c.invalidateQueries({ queryKey: keys.players }))

  const ranked = useMemo(
    () =>
      (players ?? [])
        .filter((p) => p.mode === 'economy')
        .sort((a, b) => b.balance - a.balance),
    [players],
  )

  if (isLoading) return <Spinner />

  const medal = (i: number) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`)

  return (
    <div className="space-y-5">
      <header className="pt-1 text-center">
        <h1 className="text-3xl text-gold-300">Leaderboard</h1>
        <p className="text-sm text-bone/50">Economy players, richest first. Updates live.</p>
      </header>

      <div className="space-y-2">
        {ranked.map((p, i) => {
          const me = p.id === player?.id
          return (
            <div
              key={p.id}
              className={`deco-card flex items-center gap-3 p-4 ${
                me ? 'border-gold-500/60 shadow-gold' : ''
              } ${i === 0 ? 'bg-felt-700/80' : ''}`}
            >
              <span className="w-8 text-center font-display text-xl text-gold-300">{medal(i)}</span>
              <Avatar emoji={p.avatar} size="sm" />
              <span className="flex-1 font-semibold text-bone">
                {p.display_name}
                {me && <span className="ml-1 text-xs text-gold-400">you</span>}
              </span>
              <ChipCount value={p.balance} className="text-lg text-gold-300" />
            </div>
          )
        })}
        {ranked.length === 0 && (
          <p className="py-12 text-center text-bone/50">No economy players yet.</p>
        )}
      </div>
    </div>
  )
}
