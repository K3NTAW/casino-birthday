import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  keys,
  usePlayers,
  useQuests,
  useRealtime,
  useShopItems,
  useTransactions,
  useWagers,
} from './queries'
import { gameLabel, type Player, type Quest, type ShopItem, type Transaction, type Wager } from './types'

/** Lookup tables used to turn a raw ledger row into "from who / what". */
export interface ActivityCtx {
  players: Map<string, Player>
  quests: Map<string, Quest>
  shopItems: Map<string, ShopItem>
  wagers: Map<string, Wager>
}

export type ActivityTone = 'jade' | 'ruby' | 'muted'

/** A human-readable view of one chip movement, from the player's perspective. */
export interface ActivityDescriptor {
  /** An emoji or the counterparty's avatar — one glyph, shown in the leading circle. */
  icon: string
  title: string
  /** The "from who / what" line, e.g. "from Anna" or "Mojito". */
  detail: string
  /** Signed amount (mirrors the ledger row). */
  amount: number
  tone: ActivityTone
}

export type FeedRow = { txn: Transaction } & ActivityDescriptor

function gameOf(ctx: ActivityCtx, refId: string | null): string {
  const w = refId ? ctx.wagers.get(refId) : undefined
  return w ? gameLabel(w.game_type) : 'a game'
}

/**
 * Translate one ledger row into something a guest can read at a glance.
 * The row is always from the owning player's perspective: positive = chips in,
 * negative = chips out. Color is paired with a +/- sign so meaning survives
 * without color (the Win/Loss-Only rule, color-blind safe).
 */
export function describeTransaction(t: Transaction, ctx: ActivityCtx): ActivityDescriptor {
  const incoming = t.amount > 0
  const tone: ActivityTone = incoming ? 'jade' : 'ruby'

  switch (t.type) {
    case 'transfer': {
      const other = t.counterparty ? ctx.players.get(t.counterparty) : undefined
      const name = other?.display_name ?? 'another guest'
      return incoming
        ? { icon: other?.avatar ?? '🎁', title: 'Received chips', detail: `from ${name}`, amount: t.amount, tone }
        : { icon: other?.avatar ?? '➤', title: 'Sent chips', detail: `to ${name}`, amount: t.amount, tone }
    }
    case 'wager_escrow':
      return { icon: '🎲', title: 'Placed a stake', detail: gameOf(ctx, t.ref_id), amount: t.amount, tone }
    case 'wager_payout':
      return { icon: '🏆', title: 'Won the pot', detail: gameOf(ctx, t.ref_id), amount: t.amount, tone }
    case 'refund':
      return { icon: '↩️', title: 'Stake refunded', detail: gameOf(ctx, t.ref_id), amount: t.amount, tone }
    case 'dealer_buyin':
      return { icon: '🃏', title: 'Table buy-in', detail: 'Dealer table', amount: t.amount, tone }
    case 'dealer_payout':
      return { icon: '🃏', title: 'Cashed out', detail: 'Dealer table', amount: t.amount, tone }
    case 'shop_purchase': {
      const item = t.ref_id ? ctx.shopItems.get(t.ref_id) : undefined
      return {
        icon: item?.emoji ?? '🍸',
        title: item ? `Bought ${item.name}` : 'Shop purchase',
        detail: 'from the bar',
        amount: t.amount,
        tone,
      }
    }
    case 'quest_reward': {
      const quest = t.ref_id ? ctx.quests.get(t.ref_id) : undefined
      return {
        icon: '🗝️',
        title: quest ? quest.title : 'Quest reward',
        detail: 'Quest complete',
        amount: t.amount,
        tone,
      }
    }
    case 'admin_grant':
      return {
        icon: '👑',
        title: incoming ? 'Chips from the house' : 'House adjustment',
        detail: 'Host',
        amount: t.amount,
        tone,
      }
    case 'mode_park':
      return { icon: '🅿️', title: 'Chips parked', detail: 'Switched to Casual', amount: t.amount, tone: 'muted' }
    case 'mode_unpark':
      return { icon: '💰', title: 'Chips restored', detail: 'Back in Economy', amount: t.amount, tone: 'muted' }
    default:
      return { icon: '◈', title: String(t.type).replace(/_/g, ' '), detail: '', amount: t.amount, tone }
  }
}

/** A short, party-friendly relative time. Pass `now` for deterministic tests. */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const mins = Math.floor((now - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return new Date(iso).toLocaleDateString()
}

/**
 * The player's own activity feed: their ledger rows resolved to readable rows,
 * kept live as new chip moves land. Shared by Home (preview) and the Activity page.
 */
export function useActivityFeed(playerId: string): {
  rows: FeedRow[]
  isLoading: boolean
  totals: { received: number; spent: number }
} {
  const qc = useQueryClient()
  const { data: txns = [], isLoading } = useTransactions(playerId)
  const { data: players = [] } = usePlayers()
  const { data: quests = [] } = useQuests()
  const { data: shopItems = [] } = useShopItems()
  const { data: wagers = [] } = useWagers()

  useRealtime(
    ['transactions'],
    () => playerId && qc.invalidateQueries({ queryKey: keys.transactions(playerId) }),
    [playerId],
  )

  const ctx = useMemo<ActivityCtx>(
    () => ({
      players: new Map(players.map((p) => [p.id, p])),
      quests: new Map(quests.map((q) => [q.id, q])),
      shopItems: new Map(shopItems.map((s) => [s.id, s])),
      wagers: new Map(wagers.map((w) => [w.id, w])),
    }),
    [players, quests, shopItems, wagers],
  )

  const rows = useMemo<FeedRow[]>(
    () => txns.map((txn) => ({ txn, ...describeTransaction(txn, ctx) })),
    [txns, ctx],
  )

  const totals = useMemo(() => {
    let received = 0
    let spent = 0
    for (const t of txns) {
      if (t.amount > 0) received += t.amount
      else spent += -t.amount
    }
    return { received, spent }
  }, [txns])

  return { rows, isLoading, totals }
}
