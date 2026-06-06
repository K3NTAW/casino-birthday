import { NavLink, useLocation } from 'react-router-dom'
import type { ComponentType } from 'react'
import { usePlayer } from '@/context/PlayerContext'
import { useSettings } from '@/lib/queries'
import {
  IconCrown,
  IconDice,
  IconHome,
  IconKey,
  IconSend,
  IconShield,
  IconWine,
  type IconProps,
} from '@/components/icons'

interface Tab {
  to: string
  label: string
  Icon: ComponentType<IconProps>
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { player, isAdmin } = usePlayer()
  const { data: settings } = useSettings()
  const loc = useLocation()
  const economy = player?.mode === 'economy'

  // The bottom bar adapts to mode — casual players see fewer tabs.
  const tabs: Tab[] = economy
    ? [
        { to: '/home', label: 'Home', Icon: IconHome },
        { to: '/games', label: 'Games', Icon: IconDice },
        { to: '/send', label: 'Send', Icon: IconSend },
        { to: '/quests', label: 'Quests', Icon: IconKey },
        { to: '/shop', label: 'Shop', Icon: IconWine },
      ]
    : [
        { to: '/home', label: 'Home', Icon: IconHome },
        { to: '/games', label: 'Games', Icon: IconDice },
        { to: '/shop', label: 'Shop', Icon: IconWine },
      ]

  if (economy && settings?.leaderboard_visible) {
    tabs.push({ to: '/leaderboard', label: 'Ranks', Icon: IconCrown })
  }
  if (isAdmin) {
    tabs.push({ to: '/admin', label: 'Admin', Icon: IconShield })
  }

  return (
    // Fixed-height app shell: main scrolls internally, the nav sits in normal
    // flow at the bottom. This avoids the fixed-nav overscroll gap and the
    // magic clearance the old layout needed (the source of the bottom padding
    // weirdness on short/scrolly pages like Games and Activity).
    <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden">
      {/* safe-top insets under the island/status bar. main owns the scroll. */}
      <main className="flex-1 overflow-y-auto overscroll-contain px-4 safe-top pb-6">
        {/* Re-key on route so each screen rises in. */}
        <div key={loc.pathname} className="rise">
          {children}
        </div>
      </main>

      <nav
        className="relative z-40 shrink-0 border-t border-gold-500/20 bg-felt-850/90 backdrop-blur-md"
        // Claw back most of the iOS home-indicator inset so the bar isn't a
        // big dead band in standalone PWA mode; keep a few px so the indicator
        // line doesn't sit on the labels. Non-PWA devices get 0.
        style={{ paddingBottom: 'max(0px, calc(env(safe-area-inset-bottom) - 1.5rem))' }}
      >
        {/* Hairline gold glow riding the top edge of the bar. */}
        <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-gold-500/50 to-transparent" />
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
        >
          {tabs.map((t) => {
            const active = loc.pathname === t.to || loc.pathname.startsWith(t.to + '/')
            return (
              <NavLink
                key={t.to}
                to={t.to}
                className={[
                  'relative flex flex-col items-center gap-1 py-2 text-[11px] font-semibold tracking-wide transition-colors duration-200 ease-out-quart',
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
                    'grid h-7 place-items-center transition-transform duration-300 ease-out-expo',
                    active ? '-translate-y-0.5 drop-shadow-[0_0_7px_rgba(212,175,55,0.6)]' : '',
                  ].join(' ')}
                >
                  <t.Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2 : 1.75} />
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
