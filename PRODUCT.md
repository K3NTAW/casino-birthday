# Product

## Register

product

## Users

~10–20 guests at a single-night birthday party who know each other. Their context is the
opposite of a desk: they're standing, holding a drink, in a dim and noisy room, glancing at
their phone for a few seconds between conversations. No one reads a manual; everyone opens the
same URL, joins with a name + avatar, and starts playing. A subset are **hosts** (admins) who
also run dealer tables and hand out shop items from a phone.

The job to be done: **move fun chips around with zero friction** — send chips to a friend, join
or settle a game wager, claim a quest, buy a drink — and always know your balance at a glance.
Chips have no real-world value; this is purely a party game.

## Product Purpose

A throwaway, mobile-first PWA that turns a birthday party into a playful chip economy for one
night. Guests bet on real-world games (chess, Mario Party, Just Dance, blackjack, poker), trade
chips by QR or 4-char code, earn chips through honor-system quests, and spend them at the bar.
Success looks like: people actually use it all night without being taught, chip moves feel
instant and trustworthy, nobody gets stuck at zero, and the whole thing evaporates with one
"Reset everything" the next morning. It exists to add stakes and shared moments to a party, not
to be a product anyone keeps.

## Brand Personality

Refined Art Deco — **Monte Carlo, not Vegas**. Three words: **elegant, playful, warm**. The
voice is a charming croupier: confident and concise, never shouty. Copy restates exactly what's
about to happen ("Send 50 chips to Anna?") so a tipsy guest never second-guesses a tap. The
interface should feel like a private members' club for the night — gold on deep felt-green,
candle-lit, celebratory — while staying effortless to use. Emotional goals: a small thrill on a
win, a soft landing on a loss, and constant clarity about "what are my chips and what happens if
I tap this."

## Anti-references

- **Vegas neon / gaudy casino.** No loud red-black-neon, no slot-machine flash, no cheap chip
  clip-art or jackpot gradients. The whole point is restraint: Monte Carlo elegance, not a strip
  arcade.
- By extension: nothing that reads as **real-money gambling** (no FOMO mechanics, no aggressive
  green-number dopamine UI). The chips are play money and the tone stays party, not betting app.

## Design Principles

1. **Glanceable in a half-second.** Balance and the primary action on every screen must read at
   arm's length in low light. Hierarchy and contrast do the work; nothing important whispers.
2. **Forgiving by default.** Big tap targets (52px+), and a confirm dialog that restates the
   exact amount and recipient before any chip moves. Design for a standing guest with a drink in
   one hand, not a focused desk user.
3. **Elegance serves use, never the reverse.** The Deco skin is committed and worth protecting,
   but a moment of theater never costs a tap. When polish and clarity conflict, clarity wins.
4. **Trust is visible.** Chip moves feel instant and reconcilable. The UI mirrors the database's
   integrity (no negative balances, escrow is held not lost) so the game always feels fair.
5. **Built to vanish.** One-night throwaway: favor the obvious, low-ceremony solution over the
   extensible one. No feature earns its place by being future-proof.

## Accessibility & Inclusion

- **Target WCAG AA for text.** Body text ≥4.5:1, large/bold text ≥3:1 — verified against the
  dark felt backgrounds, not assumed. Avoid low-contrast bone-on-felt for anything that matters;
  reserve faded text for genuine secondary detail.
- **High-contrast, glanceable** is a first-class constraint given the dim venue and arm's-length
  reading.
- **Big, forgiving tap targets** (52px minimum already in the system) with confirm-before-move
  on every chip action.
- Honor `prefers-reduced-motion`: the chip-pop and count-flash animations need calm crossfade or
  instant fallbacks.
- Win/loss should not rely on jade/ruby color alone where it carries meaning; pair with
  icon, label, or sign.
