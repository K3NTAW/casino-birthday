import { useEffect } from 'react'
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { reads } from './api'
import { supabase } from './supabase'

export const keys = {
  settings: ['settings'] as const,
  players: ['players'] as const,
  player: (id: string) => ['player', id] as const,
  quests: ['quests'] as const,
  questPayouts: (id: string) => ['questPayouts', id] as const,
  shopItems: ['shopItems'] as const,
  shopOrders: ['shopOrders'] as const,
  wagers: ['wagers'] as const,
  wager: (id: string) => ['wager', id] as const,
  wagerParticipants: (id: string) => ['wagerParticipants', id] as const,
  sessions: ['dealerSessions'] as const,
  session: (id: string) => ['dealerSession', id] as const,
  sessionPlayers: (id: string) => ['dealerSessionPlayers', id] as const,
  dealerActions: (id: string) => ['dealerActions', id] as const,
  transactions: (id: string) => ['transactions', id] as const,
  activity: ['activity'] as const,
}

export const useSettings = () => useQuery({ queryKey: keys.settings, queryFn: reads.settings })
export const usePlayers = () => useQuery({ queryKey: keys.players, queryFn: reads.players })
export const useQuests = () => useQuery({ queryKey: keys.quests, queryFn: reads.quests })
export const useShopItems = () => useQuery({ queryKey: keys.shopItems, queryFn: reads.shopItems })
export const useShopOrders = () => useQuery({ queryKey: keys.shopOrders, queryFn: reads.shopOrders })
export const useWagers = () => useQuery({ queryKey: keys.wagers, queryFn: reads.wagers })
export const useDealerSessions = () =>
  useQuery({ queryKey: keys.sessions, queryFn: reads.dealerSessions })
export const useActivity = () => useQuery({ queryKey: keys.activity, queryFn: reads.activityLog })

export const useQuestPayouts = (id: string) =>
  useQuery({ queryKey: keys.questPayouts(id), queryFn: () => reads.questPayouts(id), enabled: !!id })
export const useTransactions = (id: string) =>
  useQuery({ queryKey: keys.transactions(id), queryFn: () => reads.transactions(id), enabled: !!id })

/**
 * Subscribe to a set of tables and invalidate matching React Query caches when
 * any of them change. This is how the dealer table, wagers, balances and shop
 * queue stay live across phones.
 */
export function useRealtime(
  tables: string[],
  onChange: (qc: QueryClient) => void,
  deps: unknown[] = [],
) {
  const qc = useQueryClient()
  useEffect(() => {
    const channel = supabase.channel(`rt:${tables.join('-')}:${Math.random().toString(36).slice(2)}`)
    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange(qc))
    }
    channel.subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
