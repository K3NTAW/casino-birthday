import { supabase } from './supabase'
import { api } from './api'
import type { Wager } from './types'

/**
 * Detect and award the app-knowable quests for the CURRENT device's player,
 * based on their settled results. Server-side `_pay_quest` is idempotent and
 * enforces one-time / repeat caps, so calling this repeatedly is safe.
 *
 * Covers: first_win, hot_streak, table_tourist, good_loser.
 * (high_roller fires on wager create; cheers fires on shop purchase.)
 */
export async function awardWagerAutoQuests(playerId: string, token: string): Promise<void> {
  const { data, error } = await supabase
    .from('wager_participants')
    .select('reported_winner_id, wager:wagers(*)')
    .eq('player_id', playerId)
  if (error || !data) return

  type Row = { wager: Wager | null }
  const settled = (data as unknown as Row[])
    .map((r) => r.wager)
    .filter((w): w is Wager => !!w && w.state === 'settled')
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  const wins = settled.filter((w) => w.winner_id === playerId)
  const losses = settled.filter((w) => !w.is_draw && w.winner_id && w.winner_id !== playerId)

  const tries: Promise<unknown>[] = []
  if (wins.length >= 1) tries.push(api.awardAutoQuest(playerId, token, 'first_win'))
  // Hot streak: the two most-recent settled games were both wins.
  if (settled.length >= 2 && settled[0].winner_id === playerId && settled[1].winner_id === playerId) {
    tries.push(api.awardAutoQuest(playerId, token, 'hot_streak'))
  }
  // Table tourist: took part in three different game types.
  const distinctGames = new Set(settled.map((w) => w.game_type))
  if (distinctGames.size >= 3) tries.push(api.awardAutoQuest(playerId, token, 'table_tourist'))
  // Good loser: consolation (repeatable, capped server-side).
  if (losses.length >= 1) tries.push(api.awardAutoQuest(playerId, token, 'good_loser'))

  await Promise.allSettled(tries)
}

/** Winner of a dealer hand earns First Win too. */
export async function awardDealerWin(playerId: string, token: string): Promise<void> {
  await api.awardAutoQuest(playerId, token, 'first_win').catch(() => {})
}
