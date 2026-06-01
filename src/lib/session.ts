import type { StoredSession } from './types'

const KEY = 'casino-night.session'

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredSession
    if (!parsed.player_id || !parsed.session_token) return null
    return parsed
  } catch {
    return null
  }
}

export function saveSession(s: StoredSession): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function setAdminDevice(isAdmin: boolean): void {
  const s = loadSession()
  if (s) saveSession({ ...s, is_admin_device: isAdmin })
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
