export type PlayerMode = 'economy' | 'casual'

export type WagerState = 'open' | 'locked' | 'reported' | 'settled' | 'disputed' | 'cancelled'
export type SessionState = 'open' | 'active' | 'closed'
export type DealerActionKind = 'check' | 'bet' | 'call' | 'raise' | 'fold'
export type QuestKind = 'auto' | 'claim'

export type TxnType =
  | 'transfer'
  | 'wager_escrow'
  | 'wager_payout'
  | 'dealer_buyin'
  | 'dealer_payout'
  | 'shop_purchase'
  | 'quest_reward'
  | 'admin_grant'
  | 'refund'
  | 'mode_park'
  | 'mode_unpark'

export interface Player {
  id: string
  display_name: string
  avatar: string
  player_code: string
  mode: PlayerMode
  balance: number
  parked_balance: number
  is_admin: boolean
  created_at: string
}

export interface Transaction {
  id: string
  player_id: string
  counterparty: string | null
  amount: number
  type: TxnType
  ref_id: string | null
  created_at: string
}

export interface Wager {
  id: string
  game_type: string
  creator_id: string
  stake_per_player: number
  state: WagerState
  winner_id: string | null
  is_draw: boolean
  pot_total: number
  created_at: string
}

export interface WagerParticipant {
  wager_id: string
  player_id: string
  has_confirmed_result: boolean
  reported_winner_id: string | null
}

export interface DealerSession {
  id: string
  game_type: string
  buyin: number
  state: SessionState
  current_hand_no: number
  pot_total: number
  created_at: string
}

export interface DealerSessionPlayer {
  session_id: string
  player_id: string
  is_casual: boolean
  table_stack: number
  has_left: boolean
  created_at: string
}

export interface DealerAction {
  id: string
  session_id: string
  hand_no: number
  player_id: string
  action: DealerActionKind
  amount: number
  created_at: string
}

export interface Quest {
  id: string
  title: string
  description: string
  reward: number
  quest_type: QuestKind
  auto_key: string | null
  repeatable: boolean
  repeat_cap: number | null
  active: boolean
  sort: number
}

export interface QuestPayout {
  id: string
  quest_id: string
  player_id: string
  amount: number
  created_at: string
}

export interface ShopItem {
  id: string
  name: string
  price: number
  emoji: string
  active: boolean
  sort: number
}

export interface ShopOrder {
  id: string
  item_id: string
  player_id: string
  is_free: boolean
  state: 'pending' | 'fulfilled'
  created_at: string
}

export interface Settings {
  id: number
  starting_balance: number
  default_wager_stake: number
  default_buyin: number
  leaderboard_visible: boolean
}

/** What we persist to localStorage as the device identity for the night. */
export interface StoredSession {
  player_id: string
  session_token: string
  is_admin_device: boolean
}

export const SELF_GAMES: { key: string; label: string; emoji: string }[] = [
  { key: 'chess', label: 'Chess', emoji: '♟️' },
  { key: 'mario_party', label: 'Mario Party', emoji: '🎮' },
  { key: 'just_dance', label: 'Just Dance', emoji: '🕺' },
  { key: 'custom', label: 'Custom Game', emoji: '🎯' },
]

export const DEALER_GAMES: { key: string; label: string; emoji: string }[] = [
  { key: 'blackjack', label: 'Blackjack', emoji: '🃏' },
  { key: 'poker', label: 'Poker', emoji: '♠️' },
]

export function gameLabel(key: string): string {
  return (
    [...SELF_GAMES, ...DEALER_GAMES].find((g) => g.key === key)?.label ??
    key.replace(/_/g, ' ')
  )
}
