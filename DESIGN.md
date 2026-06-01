---
name: Casino Night
description: A one-night birthday-party chip economy dressed in refined Art Deco — Monte Carlo, not Vegas.
colors:
  felt-900: "#0a0f0d"
  felt-800: "#0b1f17"
  felt-700: "#0f2a1f"
  felt-600: "#143b2c"
  felt-500: "#1b4d39"
  gold-500: "#d4af37"
  gold-400: "#e6c75b"
  gold-300: "#f2dd8c"
  gold-600: "#b8941f"
  bone: "#f4efe1"
  ruby: "#9b2226"
  jade: "#2a9d6f"
typography:
  display:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "clamp(1.75rem, 9vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "0.02em"
  hero-balance:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "3.75rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "normal"
  title:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.025em"
  body:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Jost, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.2em"
rounded:
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-gold:
    backgroundColor: "{colors.gold-400}"
    textColor: "{colors.felt-900}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.25rem"
    height: "52px"
  button-ghost:
    backgroundColor: "{colors.felt-700}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.25rem"
    height: "52px"
  button-danger:
    backgroundColor: "{colors.ruby}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1.25rem"
    height: "52px"
  card:
    backgroundColor: "{colors.felt-800}"
    textColor: "{colors.bone}"
    rounded: "{rounded.xl}"
    padding: "1rem"
  input:
    backgroundColor: "{colors.felt-900}"
    textColor: "{colors.bone}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
    height: "52px"
---

# Design System: Casino Night

## 1. Overview

**Creative North Star: "The Velvet Game Night"**

This is a grown-up birthday game night dressed in Art Deco finery. Picture the green felt of a
card table, candlelight, a glass of bubbly, and friends who all happen to feel like high-roller
regulars for one evening. The chips are the toy; the party is the point. Every screen should
read as celebratory and social first, with just enough hushed-club glamour (gold leaf on deep
felt) to make a tap feel like a small thrill. The mood is warm and cozy-luxe, never cold or
corporate.

The whole system is built for a very specific body: someone standing in a dim, noisy room,
holding a drink, glancing at their phone for two seconds between conversations. That forces a
discipline behind the glamour: the balance and the primary action must be readable at arm's
length in low light, tap targets must be forgiving of a tipsy thumb (52px floor), and the app
always restates exactly what's about to happen before chips move. Elegance serves use here; a
moment of theater never costs a tap.

This system explicitly **rejects Vegas**: no neon, no slot-machine flash, no jackpot gradients,
no cheap chip clip-art. It equally rejects the generic SaaS dashboard (flat gray cards, system
fonts) and anything that smells of real-money gambling (FOMO mechanics, aggressive green-number
dopamine). It is Monte Carlo at midnight, not the Strip at noon.

**Key Characteristics:**
- Deep felt-green canvas, near-black, with a single warm gold as the star accent
- A serif display voice (Cormorant Garamond) over a clean geometric sans body (Jost)
- Tactile, oversized buttons (52px+) tuned for standing, distracted, one-handed use
- Chips animate: a gold count-flash on a win, a soft pop when a stack lands
- Mobile-only, single-column, bottom-tab navigation — this never pretends to be a desktop app

## 2. Colors

A candle-lit palette: an almost-black emerald felt that recedes, lit by one warm gold that
carries nearly all the personality, with jade and ruby reserved strictly for wins and losses.

### Primary
- **Casino Gold** (#d4af37, with #e6c75b / #f2dd8c lighter steps and #b8941f deeper): the single
  star of the system. It is the balance number, the primary button fill, active nav, borders,
  dividers, and labels. Gold means "this matters" — value, action, the win. The lighter
  **Champagne Gold** (#f2dd8c, `gold-300`) carries large display text and headings where pure
  gold-500 would sit too dark on felt.

### Secondary
- **Jade Win** (#2a9d6f): success only — a settled pot in your favor, a confirmed quest, a
  positive delta. Never decorative.
- **Ruby Loss** (#9b2226): loss / danger only — a lost stake, a destructive action, a negative
  delta. Never decorative.

### Neutral
- **Bone** (#f4efe1): the warm off-white for all primary text and the readable body voice. High
  contrast on felt; this is the workhorse, not gold.
- **Felt-900** (#0a0f0d): the near-black background. The body also wears a subtle deco texture —
  a top radial emerald vignette plus a faint 45° gold grid at ~2.5% opacity.
- **Felt-800 / 700 / 600 / 500** (#0b1f17 → #1b4d39): the emerald elevation ramp. Cards, ghost
  buttons, inputs, and avatars layer up this scale to build depth without shadows doing the work.

### Named Rules
**The Gold-Is-Earned Rule.** Gold is the most expensive ink in the building. Spend it on value
and action: the balance, the primary CTA, the active tab, a thin border or divider. The moment
two solid-gold buttons compete on one screen, gold has stopped meaning anything. One gold
decision per view.

**The Win/Loss-Only Rule.** Jade and ruby are forbidden as decoration, theme color, or "accent
variety." They are semantic signals for chips gained and chips lost. If a jade element doesn't
mean a win and a ruby element doesn't mean a loss or a danger, it is the wrong color.

## 3. Typography

**Display Font:** Cormorant Garamond (with Georgia, serif fallback)
**Body Font:** Jost (with system-ui, sans-serif fallback)

**Character:** A high-contrast pairing on purpose — an elegant, old-world serif with real flair
against a clean, geometric, almost Deco-era sans. Cormorant brings the candlelit-club glamour and
the celebratory feel to numbers and headings; Jost keeps everything you actually have to *read*
crisp, modern, and legible at a glance. The contrast between them is the whole point; never blur
it by setting body copy in the serif.

### Hierarchy
- **Hero Balance** (Cormorant 600, 3.75rem / `text-6xl`, line-height 1, `gold-300`, tabular-nums):
  the single biggest thing on Home — your chip stack. Animated by the `ChipCount` counter.
- **Display / H1** (Cormorant 600, clamp ~1.75–3.75rem, tracking ~0.02em): page-level headings
  and big celebratory moments. `text-wrap: balance` for even lines.
- **Tracked Section Mark** (Cormorant 600, ~1.875rem / `text-3xl`, letter-spacing 0.3em,
  `gold-300`): the signature spaced-out gold heading for section moments.
- **Title / H2** (Cormorant 600, 1.25rem / `text-xl`, `gold-300`): section titles inside a view.
- **Body** (Jost 400, 1rem, line-height 1.5, `bone`): all readable copy. Keep prose ≤ 65–75ch
  (rarely an issue inside the 28rem mobile column).
- **Label** (Jost 600, 0.75rem / `text-xs`, letter-spacing 0.2em, UPPERCASE, `gold-300` at ~70%):
  eyebrow-style field labels and meta. Reserved for ≤4-word labels only.

### Named Rules
**The Serif-Is-For-Show Rule.** Cormorant is for numbers, headings, and celebration — anything
meant to feel like an occasion. Jost is for everything a guest has to read and act on. Body copy,
buttons, and form values are never set in the serif; running serif text at body sizes reads as
decorative, not legible.

**The Readable-Bone Rule.** Primary text is full-strength Bone (#f4efe1), never a faded tint.
Bone at ≤50% opacity is for genuinely secondary metadata only, and never for anything a standing
guest in a dim room needs to read.

## 4. Elevation

This system is **shadow-light and tonal-first**. Depth comes mainly from the emerald felt ramp
(felt-900 background → felt-800/700 surfaces → gold hairline borders), not from heavy drop
shadows. Where shadow exists, it is soft and atmospheric: a deep ambient shadow to float a card
off the felt, and a gold glow to make a primary action feel lit from within rather than stamped
on. Think candlelight, not spotlights.

### Shadow Vocabulary
- **Deco Float** (`box-shadow: 0 10px 40px -12px rgba(0,0,0,0.7)`): the ambient lift under
  `.deco-card` surfaces. Diffuse and dark; it separates a card from the felt without a hard edge.
- **Gold Glow** (`box-shadow: 0 0 0 1px rgba(212,175,55,0.35), 0 8px 30px -8px rgba(212,175,55,0.25)`):
  reserved for the primary gold button and active accent elements. A warm halo, the "lit from
  within" effect. The active nav tab uses a lighter text drop-shadow glow of the same hue.

### Named Rules
**The Candlelight Rule.** Shadows are warm and soft, never hard and gray. If an element looks
like it has a crisp gray box-shadow from a 2014 Material card, it's wrong — deepen and diffuse it,
or replace it with a felt tonal step and a gold hairline border instead.

## 5. Components

### Buttons
- **Shape:** Generously rounded (`0.75rem` / `rounded-xl` on `.btn`), 52px minimum height — sized
  for a standing, one-handed, possibly-tipsy tap. All buttons press in with `active:scale-[0.97]`
  (touch feedback, not hover).
- **Gold (primary):** vertical gold gradient (#e6c75b → #b8941f) with near-black `felt-900` text
  and the Gold Glow shadow. The one "do this" action per screen.
- **Ghost (secondary):** translucent `felt-700` fill with a thin gold border (`gold-500/30`) and
  bone text. The default for everything that isn't the hero action.
- **Danger:** translucent ruby fill (`ruby/20`) with a ruby border and bone text. Destructive or
  loss-confirming actions only.
- **Disabled:** drops to 40% opacity and stops the press-scale. No separate gray.

### Chips (chip counter, not filter chips)
- **ChipCount:** the signature element. A `tabular-nums` Cormorant number that animates between
  values over ~500ms with an ease-out curve, and flashes from champagne-gold to bone
  (`count-flash`) when the value rises. This is how a win *feels*. New stacks land with a
  `chip-pop` scale bounce-in.
- **Pill / tag:** small pill (`rounded-full`, `text-xs`, semibold) with a 1px tinted border and no
  fill, in one of four tones — gold (default), jade (win), ruby (loss), muted (neutral meta).

### Cards / Containers
- **`.deco-card`:** the house container. Corners at `1.5rem` (`rounded-2xl`), `felt-800` at ~70%
  opacity with a faint `backdrop-blur`, a `gold-500/20` hairline border, and the Deco Float
  shadow. Internal padding ~1rem.
- **Nesting is forbidden.** A deco-card never contains another deco-card; use a felt tonal step or
  a `.deco-divider` (a horizontal gold-fade hairline) to separate content within one card.

### Inputs / Fields
- **Style:** dark `felt-900/60` fill, thin gold border (`gold-500/25`), `rounded-xl`, 52px tall,
  bone text. Placeholder is bone at low opacity (treat as secondary, never as the actual value).
- **Focus:** the border brightens to `gold-500/70`; the default outline is removed in favor of the
  gold border shift. Calm, no harsh ring.

### Navigation
- **Fixed bottom tab bar** — the only nav. `felt-900/95` with `backdrop-blur`, a top gold hairline,
  and iOS safe-area padding. Tabs are an emoji icon over an 11px tracked label. Active tab is
  `gold-300` with a gold icon glow; inactive is bone at ~45%. The tab set *adapts to player mode*:
  casual players see fewer tabs; admins gain an Admin tab. Single-column, max-width 28rem (`max-w-md`)
  — the app is mobile-only by design and is centered on larger screens, never stretched.

### ChipCount (signature)
See Chips above. It is the soul of the app: chips are the product, and the animated gold counter
is what makes gaining them feel like a win and losing them sting a little. Protect it.

## 6. Do's and Don'ts

### Do:
- **Do** keep the balance and the one primary action the two loudest things on every screen —
  readable at arm's length in a dim room.
- **Do** spend gold sparingly per the Gold-Is-Earned Rule: one gold CTA per view, gold elsewhere
  only as thin borders, dividers, the balance, and the active tab.
- **Do** set headings, numbers, and celebratory moments in Cormorant; set everything readable in
  Jost (the Serif-Is-For-Show Rule).
- **Do** keep primary text full-strength Bone (#f4efe1) and verify AA contrast on felt; reserve
  faded bone (≤50%) for true secondary metadata only.
- **Do** keep tap targets ≥52px and confirm-restate every chip move ("Send 50 chips to Anna?")
  before it happens.
- **Do** use jade strictly for wins and ruby strictly for losses/danger, always paired with a
  label, sign, or icon so meaning survives without color.
- **Do** give the chip counter room to animate; let a win flash gold and a stack pop.
- **Do** honor `prefers-reduced-motion` with a calm crossfade or instant fallback for `chip-pop`,
  `count-flash`, and `shimmer`.

### Don't:
- **Don't** go Vegas neon or gaudy: no glowing neon, no slot-machine flash, no jackpot gradients,
  no cheap chip clip-art. Monte Carlo, not the Strip.
- **Don't** let this read as a generic SaaS dashboard — no flat gray cards, no system-font admin
  tables, no soulless white panels.
- **Don't** borrow real-money-gambling tropes: no FOMO mechanics, no aggressive green-number
  dopamine UI. The chips are play money and the tone stays party.
- **Don't** nest a card inside a card; separate content with a felt tonal step or a `.deco-divider`.
- **Don't** put two solid-gold buttons on one screen — gold stops meaning anything the moment it
  competes with itself.
- **Don't** set body copy, button labels, or form values in Cormorant; the serif is for show, not
  for reading.
- **Don't** rely on hard, gray, 2014-Material box-shadows; shadows here are warm, soft, and
  candle-lit, or replaced by tonal felt steps and gold hairlines.
- **Don't** design for desktop. This is a centered 28rem mobile column with a bottom tab bar; never
  stretch it wide or add a sidebar.
