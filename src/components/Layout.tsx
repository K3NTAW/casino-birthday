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
        { to: '/activity', label: 'Activity', icon: '🧾' },
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
      <main className="flex-1 px-4 pb-28 pt-2 safe-top">
        {/* Re-key on route so each screen rises in. */}
        <div key={loc.pathname} className="rise">
          {children}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-gold-500/20 bg-felt-850/90 backdrop-blur-md safe-bottom">
        {/* Hairline gold glow riding the top edge of the bar. */}
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
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
                  'relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold tracking-wide transition-colors duration-200 ease-out-quart',
                  active ? 'text-gold-300' : 'text-bone/55',
                ].join(' ')}
              >
                {/* Active marker — a small gold lozenge above the icon. */}
                <span
                  className={[
                    'absolute top-0 h-0.5 w-7 rounded-full bg-gold-400 transition-all duration-300 ease-out-expo',
                    active ? 'opacity-100 shadow-glow' : 'opacity-0',
                  ].join(' ')}
                />
                <span
                  className={[
                    'grid h-7 w-7 place-items-center text-lg leading-none transition-transform duration-300 ease-out-expo',
                    active ? '-translate-y-0.5 drop-shadow-[0_0_8px_rgba(212,175,55,0.65)]' : '',
                  ].join(' ')}
                >
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
