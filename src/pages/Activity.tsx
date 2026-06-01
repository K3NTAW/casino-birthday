import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePlayer } from '@/context/PlayerContext'
import { useActivityFeed } from '@/lib/activity'
import { ActivityList } from '@/components/ActivityList'
import { EmptyState, Spinner } from '@/components/ui'
import { IconBack } from '@/components/icons'

type Filter = 'all' | 'in' | 'out'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'in', label: 'Received' },
  { key: 'out', label: 'Spent' },
]

export default function Activity() {
  const { player } = usePlayer()
  const { rows, isLoading, totals } = useActivityFeed(player?.id ?? '')
  const [filter, setFilter] = useState<Filter>('all')

  const shown = useMemo(
    () =>
      rows.filter((r) =>
        filter === 'all' ? true : filter === 'in' ? r.amount > 0 : r.amount < 0,
      ),
    [rows, filter],
  )

  if (!player) return null

  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3 pt-1">
        <Link to="/home" className="icon-btn" aria-label="Back to home">
          <IconBack className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl text-gold-300">Activity</h1>
          <p className="text-xs text-bone/60">Every chip in and out, tonight</p>
        </div>
      </header>

      {/* Night summary */}
      <section className="deco-card flex divide-x divide-gold-500/15 p-0">
        <div className="flex-1 p-4 text-center">
          <p className="label">Received</p>
          <p className="chip-amount mt-1 text-2xl tabular-nums text-jade">
            +{totals.received.toLocaleString()}
          </p>
        </div>
        <div className="flex-1 p-4 text-center">
          <p className="label">Spent</p>
          <p className="chip-amount mt-1 text-2xl tabular-nums text-ruby">
            −{totals.spent.toLocaleString()}
          </p>
        </div>
      </section>

      {/* Filter */}
      <div className="flex gap-2" role="tablist" aria-label="Filter activity">
        {FILTERS.map((f) => {
          const active = filter === f.key
          return (
            <button
              key={f.key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={`flex-1 rounded-xl border px-3 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${
                active
                  ? 'border-gold-500/60 bg-felt-700/60 text-gold-300'
                  : 'border-gold-500/15 text-bone/60'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {isLoading ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <EmptyState
          emoji="🪙"
          title={filter === 'all' ? 'No chip moves yet' : 'Nothing here yet'}
          sub={
            filter === 'all'
              ? 'Send chips, play a game, or claim a quest and it shows up here.'
              : 'Switch the filter to see your other chip moves.'
          }
        />
      ) : (
        <ActivityList rows={shown} />
      )}
    </div>
  )
}
