# 🎲 Casino Night

A mobile-first **Progressive Web App** for a one-night birthday party (~10–20 guests).
Everyone opens the same URL on their phone, joins with a name + avatar, and gets a stack of
**fun chips** to bet on games, buy drinks, trade with friends, and earn through quests.

> **Chips have no real-world or monetary value.** This is purely a party game. There are no
> real payments anywhere in the app.

It's a deliberate **one-night throwaway** — not over-engineered, no multi-event support, no
historical archive. There is a single admin **"Reset everything"** action to clear and reuse it.

---

## Highlights

- **Two player modes** (opt-in economy):
  - **Economy** — start with 1000 chips, bet/trade/quest/leaderboard. The full game.
  - **Casual** — no running balance to track. Play games for fun, free bar, and sit at dealer
    tables with a *ring-fenced throwaway stack* that never follows them around.
- **Two game types:**
  - **Self-managed wagers** (Chess, Mario Party, Just Dance, Custom) — escrow, play IRL,
    everyone confirms the result, pot pays out. Disputes go to a host.
  - **Dealer games** (Blackjack, Poker) — the host runs the betting flow; **live per-action
    bets** (check/call/raise/fold) stream to the host screen via Supabase Realtime. No card
    engine — physical cards stay on the table.
- **Chip transfers** by QR scan **or** typed 4-char player code (the code always works, even
  with no camera).
- **Quests** (honor system, instant payout) as an anti-zero safety net so nobody is stuck at 0.
- **Shop** with tiered pricing (free for casual players; tickets drop in the host's queue).
- **Hideable leaderboard** (off by default).
- Installable PWA with offline app shell (chip data is always live, never cached).

---

## Tech stack

- **Frontend:** React + Vite + TypeScript, Tailwind CSS, installable PWA via `vite-plugin-pwa`.
- **Server state:** TanStack Query + Supabase Realtime channels.
- **Backend:** Supabase (Postgres + RLS + Realtime). All chip movements are atomic Postgres
  RPC functions.
- **Hosting:** Vercel (frontend) + Supabase (database).

---

## Quick start (local)

1. **Install**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at <https://supabase.com> (free tier is plenty).

3. **Run the migrations** in order, via the Supabase SQL Editor (Dashboard → SQL) or the CLI:
   ```
   supabase/migrations/0001_schema.sql      # tables, enums, RLS, realtime
   supabase/migrations/0002_functions.sql   # all RPC functions (the chip logic)
   supabase/migrations/0003_seed.sql        # settings, admin code, 20 quests, shop menu
   ```
   With the Supabase CLI:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push        # applies everything in supabase/migrations
   ```
   Or just paste each file into the SQL Editor and run it (top to bottom).

4. **Enable Realtime** — the schema already adds the relevant tables to the
   `supabase_realtime` publication. Nothing else to toggle.

5. **Configure env** — copy and fill:
   ```bash
   cp .env.example .env.local
   ```
   ```
   VITE_SUPABASE_URL=https://<your-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your anon public key>
   ```
   **There is no admin code in the frontend env** — by design, so it never ships in the JS
   bundle to guests' phones. The host code lives only in the database (`app_secrets.admin_code`,
   seeded to `birthday-boss-2026`) and is verified server-side. Change it before the party (see
   below) and just remember it — the host types it at runtime.

6. **Run**
   ```bash
   npm run dev
   ```
   Open the printed URL on your phone (same Wi-Fi) or use a tunnel.

### Changing the admin code

The seed inserts the code into the private `app_secrets` table. To change it:
```sql
update app_secrets set admin_code = 'your-new-code' where id = 1;
```
That's it — no redeploy needed, because the code is never baked into the frontend. The host
just types the new value under **Settings → Host access** (or the login screen's host option).

---

## Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel (framework preset: **Vite**).
2. Add the two env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) in
   **Project → Settings → Environment Variables**. (No admin code here — it lives in the DB.)
3. Deploy. Build command `npm run build`, output dir `dist` (Vercel auto-detects).
4. Open the URL on a phone → **Add to Home Screen** to install the PWA.

> Tip: a single short URL is all the guests need. Print a QR of it on the night.

---

## Becoming a host on the night

- On the login screen, tap the faint `·` to reveal **host options** and enter the host code,
  **or** join normally and enter it later under **Settings → Host access**.
- The code can be shared with a trusted friend (co-admin) so a second device shares the load —
  `is_admin` is just a flag, more than one player can hold it.
- Host chores are minimal: **hand over shop items** (Bar tickets queue) and **run dealer
  tables**. Quests need no approval (honor system).

---

## How the chip integrity works

Chips are the whole app, so the rules are enforced in the database, not the UI:

- **Every** chip movement happens inside a `SECURITY DEFINER` Postgres RPC (`transfer_chips`,
  `settle_wager`, `payout_dealer`, `buy_shop_item`, …). These run as the table owner and are
  the *only* way balances change.
- **No negative balances** — guarded by a `CHECK (balance >= 0)` and explicit checks in every
  RPC, which fail cleanly if you can't afford something.
- **Immutable ledger** — every movement writes a `transactions` row. A player's balance is
  reconcilable from the ledger. (Casual table-stack chips are session-local and intentionally
  *not* ledgered — they don't exist off the table.)
- **Confirm before every chip move** — the UI always shows a dialog restating the exact amount
  and recipient (“Send 50 chips to Anna?”), to prevent tipsy mis-taps.
- **Escrow is held**, not lost — cancelling an unsettled wager refunds every stake.

## Trust model (read this — it's intentionally lightweight)

This is a closed, one-night party for people who know each other, so the security model is
deliberately minimal — but **not** naive:

- **No passwords / email / OAuth.** Identity is a per-device `session_token` stored in
  `localStorage` and in a **private** `player_sessions` table (no RLS read policy → other
  guests can't read it and impersonate you).
- **The anon key is shared** among all guests (it ships in the frontend). That's expected.
- **Client tables are read-only over the anon key.** RLS grants `SELECT` but there are **no**
  direct `INSERT/UPDATE/DELETE` policies, so nobody can edit a balance or self-promote to admin
  via the REST API. Every mutation must go through the vetted RPCs.
- **Destructive/admin actions are gated server-side** inside the RPCs (`_require_admin`), which
  check the caller's `is_admin` flag. `is_admin` can only be set by `claim_admin`, which
  verifies the code against the private `app_secrets` table.
- Player-initiated RPCs verify the caller's session token, so you can't move *someone else's*
  chips.

What we explicitly **don't** defend against: a determined guest with dev tools who knows
another player's session token, or who spams valid actions. For a birthday party, that's an
acceptable trade-off. Don't reuse this auth model for anything that matters.

---

## Project layout

```
supabase/migrations/   0001 schema · 0002 RPC functions · 0003 seed
src/
  lib/        supabase client, types, api (RPC wrappers), queries (hooks + realtime)
  context/    PlayerContext (session + live balance)
  components/ Layout/tab bar, ConfirmDialog, Toast, QR, ui primitives
  pages/      Login, Home, Games, WagerDetail, SessionDetail, Send, Quests,
              Shop, Leaderboard, Admin, Settings
scripts/      make-icons.mjs (generates the PWA chip icons, no deps)
```

## Tunable numbers (admin-editable, Host panel → Tunable numbers)

| Setting | Default |
| --- | --- |
| Starting balance (economy) | **1000** |
| Default self-managed wager stake | **50** |
| Default dealer buy-in | **200** |
| Leaderboard visible | **off** |

---

## Notes / out of scope

No real payments, no multi-event support, no email/OAuth, no card-dealing engine, and no quest
verification (honor system by design). See the spec's Section 14. Have a great party. 🥂
# casino-birthday
