import { relativeTime, type ActivityTone, type FeedRow } from '@/lib/activity'

const toneClass: Record<ActivityTone, string> = {
  jade: 'text-jade',
  ruby: 'text-ruby',
  muted: 'text-bone/70',
}

function sign(amount: number): string {
  if (amount > 0) return '+'
  if (amount < 0) return '−'
  return ''
}

/** One ledger row: avatar/emoji · what happened + who/what · signed amount. */
export function ActivityRow({ row }: { row: FeedRow }) {
  const { icon, title, detail, amount, tone, txn } = row
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gold-500/25 bg-felt-700 text-xl"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-bone">{title}</p>
        <p className="truncate text-xs text-bone/60">
          {detail && <span>{detail} · </span>}
          {relativeTime(txn.created_at)}
        </p>
      </div>
      <span className={`chip-amount shrink-0 text-base font-semibold tabular-nums ${toneClass[tone]}`}>
        {sign(amount)}
        {Math.abs(amount).toLocaleString()}
      </span>
    </div>
  )
}

/** A single deco-card containing divided rows — never a stack of nested cards. */
export function ActivityList({ rows }: { rows: FeedRow[] }) {
  return (
    <div className="deco-card divide-y divide-gold-500/10 p-0">
      {rows.map((row) => (
        <ActivityRow key={row.txn.id} row={row} />
      ))}
    </div>
  )
}
