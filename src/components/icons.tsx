import type { SVGProps } from 'react'

/**
 * A small, consistent line-icon set for the app's functional chrome (nav, back,
 * settings, actions). Identity/content stays as emoji (player avatars, the bar
 * menu, activity rows) — icons are reserved for controls and navigation.
 *
 * 24px grid, 1.75 stroke, round caps. Color follows `currentColor`; size with
 * a className (h-5 w-5) — CSS overrides the intrinsic 24px.
 */
function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      {children}
    </svg>
  )
}

export type IconProps = SVGProps<SVGSVGElement>

export const IconBack = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
)

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
)

export const IconHome = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
  </Svg>
)

export const IconDice = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="18" height="18" rx="3" />
    <circle cx="8" cy="8" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="16" cy="8" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="8" cy="16" r="1.15" fill="currentColor" stroke="none" />
    <circle cx="16" cy="16" r="1.15" fill="currentColor" stroke="none" />
  </Svg>
)

export const IconSend = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 3 3 10.5l7 2.5 2.5 7z" />
    <path d="M21 3 10 14" />
  </Svg>
)

export const IconReceipt = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 3v18l2-1.2 2 1.2 2-1.2 2 1.2 2-1.2 2 1.2V3l-2 1.2L13 3l-2 1.2L9 3 7 4.2z" />
    <path d="M9 8h6" />
    <path d="M9 12h6" />
    <path d="M9 16h4" />
  </Svg>
)

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7.5" cy="15.5" r="4.5" />
    <path d="m10.7 12.3 8.3-8.3" />
    <path d="m16 5 3 3" />
    <path d="m18.5 7.5 1.8-1.8" />
  </Svg>
)

export const IconWine = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10c-.4 3-1 5.5-1 6.5a4 4 0 0 1-8 0C8 9.5 7.4 7 7 4Z" />
    <path d="M7.5 8h9" />
    <path d="M12 14.5V21" />
    <path d="M8.5 21h7" />
  </Svg>
)

export const IconCrown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 7l4 3 5-6 5 6 4-3-2.2 12H5.2z" />
    <path d="M5 21h14" />
  </Svg>
)

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5c0 4.2 2.9 7.5 7 9 4.1-1.5 7-4.8 7-9V6z" />
    <path d="m9.5 12 1.8 1.8 3.5-3.6" />
  </Svg>
)
