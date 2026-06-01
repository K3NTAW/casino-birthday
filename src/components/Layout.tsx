import { NavLink, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { useSettings } from '@/lib/queries'

interface Tab {
  to: string
  label: string
  icon: string
}

export function Layout({ children }: { children: ReactNode }) {
  const { player, isAdmin } = usePlayer()
  const { data: settings } = useSettings()
  const loc = useLocation()
  const economy = player?.mode === 'economy'

  // The bottom bar adapts to mode — casual players see fewer tabs.
  const tabs: Tab[] = economy
    ? [
        { to: '/home', label: 'Home', icon: '🏠' },
        { to: '/games', label: 'Games', icon: '🎲' },
        { to: '/send', label: 'Send', icon: '➤' },
        { to: '/quests', label: 'Quests', icon: '🗝️' },
        { to: '/shop', label: 'Shop', icon: '🍸' },
      ]
    : [
        { to: '/home', label: 'Home', icon: '🏠' },
        { to: '/games', label: 'Games', icon: '🎲' },
        { to: '/shop', label: 'Shop', icon: '🍸' },
      ]

  if (economy && settings?.leaderboard_visible) {
    tabs.push({ to: '/leaderboard', label: 'Ranks', icon: '👑' })
  }
  if (isAdmin) {
    tabs.push({ to: '/admin', label: 'Admin', icon: '⚙️' })
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <main className="flex-1 px-4 pb-28 pt-2 safe-top">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-500/20 bg-felt-900/95 backdrop-blur safe-bottom">
        <div
          className="mx-auto grid max-w-md"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((t) => {
            const active = loc.pathname === t.to || loc.pathname.startsWith(t.to + '/')
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={[
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold tracking-wide transition',
                  active ? 'text-gold-300' : 'text-bone/60',
                ].join(' ')}
              >
                <span className={`text-lg leading-none ${active ? 'drop-shadow-[0_0_6px_rgba(212,175,55,0.6)]' : ''}`}>
                  {t.icon}
                </span>
                {t.label}
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
