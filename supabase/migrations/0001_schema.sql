-- ============================================================================
-- Casino Night — schema
-- One-night party PWA. Fun chips, NO real money.
--
-- Integrity model (see README "Trust model"):
--   * All chip movements happen inside SECURITY DEFINER RPC functions
--     (0002_functions.sql) which run as the table owner and bypass RLS.
--   * Client-facing tables expose SELECT only. There are NO direct
--     INSERT/UPDATE/DELETE policies, so the shared anon key cannot mutate
--     balances, set is_admin, or tamper with the ledger directly.
--   * Secrets (admin code) live in app_secrets with NO policy at all -> only
--     SECURITY DEFINER functions can read them.
--   * Per-device session tokens live in player_sessions (NO policy) so they
--     cannot be read by other guests and used to impersonate.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type player_mode as enum ('economy', 'casual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type txn_type as enum (
    'transfer', 'wager_escrow', 'wager_payout', 'dealer_buyin', 'dealer_payout',
    'shop_purchase', 'quest_reward', 'admin_grant', 'refund', 'mode_park', 'mode_unpark'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type wager_state as enum ('open', 'locked', 'reported', 'settled', 'disputed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_state as enum ('open', 'active', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dealer_action_kind as enum ('check', 'bet', 'call', 'raise', 'fold');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quest_kind as enum ('auto', 'claim');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists players (
  id             uuid primary key default gen_random_uuid(),
  display_name   text not null,
  avatar         text not null default '🎲',
  player_code    text not null unique,            -- short human code, e.g. 'A7QК'
  mode           player_mode not null default 'economy',
  balance        int not null default 0 check (balance >= 0),
  parked_balance int not null default 0 check (parked_balance >= 0),
  -- True once this player has ever received a starting balance, so switching
  -- economy<->casual can never mint a fresh 1000 by busting out and back.
  has_seeded     boolean not null default false,
  is_admin       boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Per-device secret. NOT publicly readable.
create table if not exists player_sessions (
  player_id     uuid primary key references players(id) on delete cascade,
  session_token text not null
);

-- Immutable ledger. Every chip movement writes one row.
create table if not exists transactions (
  id           uuid primary key default gen_random_uuid(),
  player_id    uuid not null references players(id) on delete cascade,
  counterparty text,                              -- player id / pot id / 'shop' / 'quest' / 'admin'
  amount       int not null,                      -- signed: +credit / -debit
  type         txn_type not null,
  ref_id       uuid,                              -- wager/session/order/quest id when relevant
  created_at   timestamptz not null default now()
);

create table if not exists wagers (
  id              uuid primary key default gen_random_uuid(),
  game_type       text not null,                  -- 'chess' | 'mario_party' | 'just_dance' | 'custom'
  creator_id      uuid not null references players(id) on delete cascade,
  stake_per_player int not null check (stake_per_player >= 0),
  state           wager_state not null default 'open',
  winner_id       uuid references players(id),    -- null until settled; null on draw
  is_draw         boolean not null default false,
  pot_total       int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists wager_participants (
  wager_id            uuid not null references wagers(id) on delete cascade,
  player_id           uuid not null references players(id) on delete cascade,
  has_confirmed_result boolean not null default false,
  reported_winner_id  uuid references players(id),  -- their claimed result; null = draw
  primary key (wager_id, player_id)
);

create table if not exists dealer_sessions (
  id              uuid primary key default gen_random_uuid(),
  game_type       text not null,                  -- 'blackjack' | 'poker'
  buyin           int not null check (buyin >= 0),
  state           session_state not null default 'open',
  current_hand_no int not null default 1,
  pot_total       int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists dealer_session_players (
  session_id  uuid not null references dealer_sessions(id) on delete cascade,
  player_id   uuid not null references players(id) on delete cascade,
  is_casual   boolean not null default false,     -- true => table_stack is ring-fenced/throwaway
  table_stack int not null default 0 check (table_stack >= 0),
  has_left    boolean not null default false,
  created_at  timestamptz not null default now(),
  primary key (session_id, player_id)
);

-- Live feed of per-action bets shown on the admin screen (realtime).
create table if not exists dealer_actions (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references dealer_sessions(id) on delete cascade,
  hand_no    int not null,
  player_id  uuid not null references players(id) on delete cascade,
  action     dealer_action_kind not null,
  amount     int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists quests (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text not null,
  reward      int not null check (reward >= 0),
  quest_type  quest_kind not null,
  auto_key    text,                               -- e.g. 'first_win' (auto quests only)
  repeatable  boolean not null default false,
  repeat_cap  int,                                -- max payouts when repeatable
  active      boolean not null default true,
  sort        int not null default 0
);

create table if not exists quest_payouts (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references quests(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  amount     int not null,
  created_at timestamptz not null default now()
);

create table if not exists shop_items (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
  price  int not null check (price >= 0),
  emoji  text not null default '🍸',
  active boolean not null default true,
  sort   int not null default 0
);

create table if not exists shop_orders (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references shop_items(id) on delete cascade,
  player_id  uuid not null references players(id) on delete cascade,
  is_free    boolean not null default false,      -- true for casual players
  state      text not null default 'pending',     -- 'pending' | 'fulfilled'
  created_at timestamptz not null default now()
);

-- Single-row config (id = 1).
create table if not exists settings (
  id                 int primary key default 1,
  starting_balance   int not null default 1000,
  default_wager_stake int not null default 50,
  default_buyin      int not null default 200,
  leaderboard_visible boolean not null default false,
  constraint settings_singleton check (id = 1)
);

-- Server-only secrets. NO RLS policy -> unreadable by clients.
create table if not exists app_secrets (
  id         int primary key default 1,
  admin_code text not null,
  constraint app_secrets_singleton check (id = 1)
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists idx_txn_player on transactions(player_id, created_at desc);
create index if not exists idx_txn_created on transactions(created_at desc);
create index if not exists idx_wager_state on wagers(state, created_at desc);
create index if not exists idx_dealer_actions_session on dealer_actions(session_id, created_at desc);
create index if not exists idx_shop_orders_state on shop_orders(state, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Permissive SELECT for guests; absolutely no direct writes.
--   (Mutations only via SECURITY DEFINER RPCs which bypass RLS.)
-- ---------------------------------------------------------------------------
alter table players                enable row level security;
alter table player_sessions        enable row level security;
alter table transactions           enable row level security;
alter table wagers                 enable row level security;
alter table wager_participants     enable row level security;
alter table dealer_sessions        enable row level security;
alter table dealer_session_players enable row level security;
alter table dealer_actions         enable row level security;
alter table quests                 enable row level security;
alter table quest_payouts          enable row level security;
alter table shop_items             enable row level security;
alter table shop_orders            enable row level security;
alter table settings               enable row level security;
alter table app_secrets            enable row level security;

-- SELECT-only policies (read access for the party). No write policies exist,
-- so INSERT/UPDATE/DELETE from the anon key are all denied.
do $$
declare t text;
begin
  foreach t in array array[
    'players','transactions','wagers','wager_participants','dealer_sessions',
    'dealer_session_players','dealer_actions','quests','quest_payouts',
    'shop_items','shop_orders','settings'
  ] loop
    execute format('drop policy if exists %I on %I', t || '_sel', t);
    execute format('create policy %I on %I for select using (true)', t || '_sel', t);
  end loop;
end $$;
-- player_sessions and app_secrets intentionally have NO policies (private).

-- ---------------------------------------------------------------------------
-- Realtime: dealer feed, sessions, wagers, balances, leaderboard, shop queue.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'players','wagers','wager_participants','dealer_sessions',
    'dealer_session_players','dealer_actions','shop_orders','transactions'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;
