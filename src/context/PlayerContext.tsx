import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { api, reads } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { clearSession, loadSession, saveSession, setAdminDevice } from '@/lib/session'
import type { Player, PlayerMode, StoredSession } from '@/lib/types'

interface PlayerContextValue {
  session: StoredSession | null
  player: Player | null
  token: string
  loading: boolean
  /** Admin = server-verified flag on the row AND this device opted in. */
  isAdmin: boolean
  login: (name: string, avatar: string, mode: PlayerMode, adminCode?: string) => Promise<void>
  /** Get back into an existing account after a storage wipe, via code + name. */
  reclaim: (code: string, name: string) => Promise<void>
  tryAdmin: (code: string) => Promise<boolean>
  refresh: () => Promise<void>
  logout: () => void
}

const Ctx = createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => loadSession())
  const [player, setPlayer] = useState<Player | null>(null)
  const [loading, setLoading] = useState(true)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const refresh = useCallback(async () => {
    const s = sessionRef.current
    if (!s) {
      setPlayer(null)
      setLoading(false)
      return
    }
    const p = await reads.player(s.player_id)
    if (!p) {
      // Player was wiped (admin reset) — drop the stale session.
      clearSession()
      setSession(null)
      setPlayer(null)
    } else {
      setPlayer(p)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Keep this player's row live (balance, mode, admin flag) across the night.
  useEffect(() => {
    if (!session) return
    const channel = supabase
      .channel(`me:${session.player_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players', filter: `id=eq.${session.player_id}` },
        (payload) => setPlayer(payload.new as Player),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [session])

  const login = useCallback(
    async (name: string, avatar: string, mode: PlayerMode, adminCode?: string) => {
      const created = await api.createPlayer(name, avatar, mode)
      const stored: StoredSession = {
        player_id: created.id,
        session_token: created.session_token,
        is_admin_device: false,
      }
      saveSession(stored)
      setSession(stored)
      // Optional admin elevation on the same step.
      if (adminCode && adminCode.trim()) {
        const ok = await api.claimAdmin(created.id, created.session_token, adminCode.trim())
        if (ok) {
          stored.is_admin_device = true
          saveSession(stored)
          setSession({ ...stored })
        }
      }
      const p = await reads.player(created.id)
      setPlayer(p)
      setLoading(false)
    },
    [],
  )

  const reclaim = useCallback(async (code: string, name: string) => {
    const got = await api.reclaimPlayer(code.trim(), name.trim())
    const stored: StoredSession = {
      player_id: got.id,
      session_token: got.session_token,
      // Restore host powers on this device if the reclaimed account is an admin.
      is_admin_device: got.is_admin,
    }
    saveSession(stored)
    setSession(stored)
    const p = await reads.player(got.id)
    setPlayer(p)
    setLoading(false)
  }, [])

  const tryAdmin = useCallback(
    async (code: string) => {
      const s = sessionRef.current
      if (!s) return false
      const ok = await api.claimAdmin(s.player_id, s.session_token, code.trim())
      if (ok) {
        setAdminDevice(true)
        setSession({ ...s, is_admin_device: true })
        await refresh()
      }
      return ok
    },
    [refresh],
  )

  const logout = useCallback(() => {
    clearSession()
    setSession(null)
    setPlayer(null)
  }, [])

  const isAdmin = !!player?.is_admin && !!session?.is_admin_device

  const value = useMemo<PlayerContextValue>(
    () => ({
      session,
      player,
      token: session?.session_token ?? '',
      loading,
      isAdmin,
      login,
      reclaim,
      tryAdmin,
      refresh,
      logout,
    }),
    [session, player, loading, isAdmin, login, reclaim, tryAdmin, refresh, logout],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlayer(): PlayerContextValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('usePlayer must be used within PlayerProvider')
  return v
}
