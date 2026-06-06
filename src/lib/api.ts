import { supabase } from './supabase'
import type {
  DealerAction,
  DealerActionKind,
  DealerSession,
  DealerSessionPlayer,
  Player,
  PlayerMode,
  Quest,
  QuestPayout,
  Settings,
  ShopItem,
  ShopOrder,
  Transaction,
  Wager,
  WagerParticipant,
} from './types'

/** Unwrap a supabase rpc/select result, throwing a clean Error on failure. */
function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------
export const reads = {
  async player(id: string): Promise<Player | null> {
    const res = await supabase.from('players').select('*').eq('id', id).maybeSingle()
    return unwrap(res)
  },
  async players(): Promise<Player[]> {
    const res = await supabase.from('players').select('*').order('created_at')
    return unwrap(res) ?? []
  },
  async settings(): Promise<Settings> {
    const res = await supabase.from('settings').select('*').eq('id', 1).single()
    return unwrap(res)
  },
  async transactions(playerId: string): Promise<Transaction[]> {
    const res = await supabase
      .from('transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(100)
    return unwrap(res) ?? []
  },
  async activityLog(): Promise<Transaction[]> {
    const res = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(150)
    return unwrap(res) ?? []
  },
  async quests(): Promise<Quest[]> {
    const res = await supabase.from('quests').select('*').order('sort')
    return unwrap(res) ?? []
  },
  async questPayouts(playerId: string): Promise<QuestPayout[]> {
    const res = await supabase.from('quest_payouts').select('*').eq('player_id', playerId)
    return unwrap(res) ?? []
  },
  async shopItems(): Promise<ShopItem[]> {
    const res = await supabase.from('shop_items').select('*').order('sort')
    return unwrap(res) ?? []
  },
  async shopOrders(): Promise<ShopOrder[]> {
    const res = await supabase
      .from('shop_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    return unwrap(res) ?? []
  },
  async wagers(): Promise<Wager[]> {
    const res = await supabase
      .from('wagers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)
    return unwrap(res) ?? []
  },
  async wager(id: string): Promise<Wager | null> {
    const res = await supabase.from('wagers').select('*').eq('id', id).maybeSingle()
    return unwrap(res)
  },
  async wagerParticipants(wagerId: string): Promise<WagerParticipant[]> {
    const res = await supabase
      .from('wager_participants')
      .select('*')
      .eq('wager_id', wagerId)
    return unwrap(res) ?? []
  },
  async dealerSessions(): Promise<DealerSession[]> {
    const res = await supabase
      .from('dealer_sessions')
      .select('*')
      .order('created_at', { ascending: false })
    return unwrap(res) ?? []
  },
  async dealerSession(id: string): Promise<DealerSession | null> {
    const res = await supabase.from('dealer_sessions').select('*').eq('id', id).maybeSingle()
    return unwrap(res)
  },
  async dealerSessionPlayers(sessionId: string): Promise<DealerSessionPlayer[]> {
    const res = await supabase
      .from('dealer_session_players')
      .select('*')
      .eq('session_id', sessionId)
    return unwrap(res) ?? []
  },
  async dealerActions(sessionId: string): Promise<DealerAction[]> {
    const res = await supabase
      .from('dealer_actions')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(60)
    return unwrap(res) ?? []
  },
}

// ---------------------------------------------------------------------------
// Writes (RPC) — param names MUST match the SQL function signatures.
// ---------------------------------------------------------------------------
async function rpc<T = unknown>(fn: string, params: Record<string, unknown>): Promise<T> {
  return unwrap<T>((await supabase.rpc(fn, params)) as { data: T | null; error: { message: string } | null })
}

export const api = {
  createPlayer: (name: string, avatar: string, mode: PlayerMode) =>
    rpc<{ id: string; player_code: string; session_token: string; mode: PlayerMode; balance: number }>(
      'create_player',
      { p_name: name, p_avatar: avatar, p_mode: mode },
    ),

  reclaimPlayer: (code: string, name: string) =>
    rpc<{ id: string; session_token: string; mode: PlayerMode; balance: number; is_admin: boolean }>(
      'reclaim_player',
      { p_code: code, p_name: name },
    ),

  claimAdmin: (playerId: string, token: string, code: string) =>
    rpc<boolean>('claim_admin', { p_player_id: playerId, p_token: token, p_code: code }),

  transferChips: (from: string, token: string, to: string, amount: number) =>
    rpc<null>('transfer_chips', { p_from: from, p_token: token, p_to: to, p_amount: amount }),

  createWager: (creator: string, token: string, gameType: string, stake: number, opponentIds: string[]) =>
    rpc<string>('create_wager', {
      p_creator: creator,
      p_token: token,
      p_game_type: gameType,
      p_stake: stake,
      p_opponent_ids: opponentIds,
    }),

  joinWager: (player: string, token: string, wagerId: string) =>
    rpc<null>('join_wager', { p_player: player, p_token: token, p_wager_id: wagerId }),

  lockWager: (actor: string, token: string, wagerId: string) =>
    rpc<null>('lock_wager', { p_actor: actor, p_token: token, p_wager_id: wagerId }),

  reportWager: (player: string, token: string, wagerId: string, winnerId: string | null, isDraw: boolean) =>
    rpc<null>('report_wager', {
      p_player: player,
      p_token: token,
      p_wager_id: wagerId,
      p_winner_id: winnerId,
      p_is_draw: isDraw,
    }),

  settleWager: (actor: string, token: string, wagerId: string, winnerId: string | null, isDraw: boolean) =>
    rpc<null>('settle_wager', {
      p_actor: actor,
      p_token: token,
      p_wager_id: wagerId,
      p_winner_id: winnerId,
      p_is_draw: isDraw,
    }),

  cancelWager: (actor: string, token: string, wagerId: string) =>
    rpc<null>('cancel_wager', { p_actor: actor, p_token: token, p_wager_id: wagerId }),

  openDealerSession: (actor: string, token: string, gameType: string, buyin: number) =>
    rpc<string>('open_dealer_session', {
      p_actor: actor,
      p_token: token,
      p_game_type: gameType,
      p_buyin: buyin,
    }),

  joinDealerSession: (player: string, token: string, sessionId: string, casualStack: number | null) =>
    rpc<null>('join_dealer_session', {
      p_player: player,
      p_token: token,
      p_session_id: sessionId,
      p_casual_stack: casualStack,
    }),

  recordDealerAction: (
    player: string,
    token: string,
    sessionId: string,
    action: DealerActionKind,
    amount: number,
  ) =>
    rpc<null>('record_dealer_action', {
      p_player: player,
      p_token: token,
      p_session_id: sessionId,
      p_action: action,
      p_amount: amount,
    }),

  startDealerHand: (actor: string, token: string, sessionId: string) =>
    rpc<null>('start_dealer_hand', { p_actor: actor, p_token: token, p_session_id: sessionId }),

  nextDealerHand: (actor: string, token: string, sessionId: string) =>
    rpc<null>('next_dealer_hand', { p_actor: actor, p_token: token, p_session_id: sessionId }),

  payoutDealer: (actor: string, token: string, sessionId: string, winner: string, amount: number) =>
    rpc<null>('payout_dealer', {
      p_actor: actor,
      p_token: token,
      p_session_id: sessionId,
      p_winner: winner,
      p_amount: amount,
    }),

  closeDealerSession: (actor: string, token: string, sessionId: string) =>
    rpc<null>('close_dealer_session', { p_actor: actor, p_token: token, p_session_id: sessionId }),

  claimQuest: (player: string, token: string, questId: string) =>
    rpc<boolean>('claim_quest', { p_player: player, p_token: token, p_quest_id: questId }),

  awardAutoQuest: (player: string, token: string, autoKey: string) =>
    rpc<boolean>('award_auto_quest', { p_player: player, p_token: token, p_auto_key: autoKey }),

  buyShopItem: (player: string, token: string, itemId: string) =>
    rpc<{ order_id: string; free: boolean }>('buy_shop_item', {
      p_player: player,
      p_token: token,
      p_item_id: itemId,
    }),

  setPlayerMode: (player: string, token: string, newMode: PlayerMode) =>
    rpc<null>('set_player_mode', { p_player: player, p_token: token, p_new_mode: newMode }),

  adminGrantChips: (actor: string, token: string, target: string, amount: number) =>
    rpc<null>('admin_grant_chips', { p_actor: actor, p_token: token, p_target: target, p_amount: amount }),

  adminFulfilOrder: (actor: string, token: string, orderId: string) =>
    rpc<null>('admin_fulfil_order', { p_actor: actor, p_token: token, p_order_id: orderId }),

  adminUpdateSettings: (
    actor: string,
    token: string,
    starting: number | null,
    wager: number | null,
    buyin: number | null,
    leaderboard: boolean | null,
  ) =>
    rpc<null>('admin_update_settings', {
      p_actor: actor,
      p_token: token,
      p_starting: starting,
      p_wager: wager,
      p_buyin: buyin,
      p_leaderboard: leaderboard,
    }),

  adminSaveShopItem: (
    actor: string,
    token: string,
    id: string | null,
    name: string,
    price: number,
    emoji: string,
    active: boolean,
  ) =>
    rpc<string>('admin_save_shop_item', {
      p_actor: actor,
      p_token: token,
      p_id: id,
      p_name: name,
      p_price: price,
      p_emoji: emoji,
      p_active: active,
    }),

  adminSaveQuest: (
    actor: string,
    token: string,
    id: string | null,
    title: string,
    description: string,
    reward: number,
    active: boolean,
  ) =>
    rpc<string>('admin_save_quest', {
      p_actor: actor,
      p_token: token,
      p_id: id,
      p_title: title,
      p_description: description,
      p_reward: reward,
      p_active: active,
    }),

  resetAll: (actor: string, token: string) =>
    rpc<null>('reset_all', { p_actor: actor, p_token: token }),
}
