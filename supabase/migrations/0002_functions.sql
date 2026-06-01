-- ============================================================================
-- Casino Night — RPC functions (the ONLY way chips move)
--
-- Every function is SECURITY DEFINER and runs as the table owner, bypassing
-- RLS. Player-initiated functions verify the caller's per-device session
-- token; admin/destructive functions additionally require is_admin.
--
-- Invariants enforced here (not in the UI):
--   * balance >= 0 always (CHECK + explicit guards)
--   * every chip movement writes a transactions row (immutable ledger)
--   * casual table-stack movements are session-local and NOT ledgered
-- ============================================================================

set search_path = public;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function _verify_session(p_player_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from player_sessions
    where player_id = p_player_id and session_token = p_token
  ) then
    raise exception 'auth: invalid session for player %', p_player_id
      using errcode = '28000';
  end if;
end $$;

create or replace function _require_admin(p_actor_id uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _verify_session(p_actor_id, p_token);
  if not exists (select 1 from players where id = p_actor_id and is_admin) then
    raise exception 'auth: admin privileges required' using errcode = '42501';
  end if;
end $$;

create or replace function _gen_player_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..4 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from players where player_code = code);
  end loop;
  return code;
end $$;

-- ---------------------------------------------------------------------------
-- Join / identity
-- ---------------------------------------------------------------------------
create or replace function create_player(p_name text, p_avatar text, p_mode player_mode)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_code text;
  v_token text;
  v_start int;
begin
  if coalesce(trim(p_name), '') = '' then
    raise exception 'name required';
  end if;
  select starting_balance into v_start from settings where id = 1;
  v_code  := _gen_player_code();
  v_token := gen_random_uuid()::text;

  insert into players (display_name, avatar, player_code, mode, balance, has_seeded)
  values (trim(p_name), coalesce(nullif(trim(p_avatar), ''), '🎲'), v_code, p_mode,
          case when p_mode = 'economy' then v_start else 0 end,
          p_mode = 'economy')  -- economy starters are seeded; casual are not (yet)
  returning id into v_id;

  insert into player_sessions (player_id, session_token) values (v_id, v_token);

  return jsonb_build_object(
    'id', v_id, 'player_code', v_code, 'session_token', v_token,
    'mode', p_mode, 'balance', (select balance from players where id = v_id)
  );
end $$;

create or replace function claim_admin(p_player_id uuid, p_token text, p_code text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean;
begin
  perform _verify_session(p_player_id, p_token);
  select (p_code = admin_code) into v_ok from app_secrets where id = 1;
  if coalesce(v_ok, false) then
    update players set is_admin = true where id = p_player_id;
    return true;
  end if;
  return false;
end $$;

-- ---------------------------------------------------------------------------
-- Transfers
-- ---------------------------------------------------------------------------
create or replace function transfer_chips(p_from uuid, p_token text, p_to uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare v_from_mode player_mode; v_to_mode player_mode; v_bal int;
begin
  perform _verify_session(p_from, p_token);
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if p_from = p_to then raise exception 'cannot send to yourself'; end if;

  -- Lock both rows in a stable order to avoid deadlocks.
  select mode, balance into v_from_mode, v_bal from players where id = p_from for update;
  select mode into v_to_mode from players where id = p_to for update;
  if v_from_mode is null or v_to_mode is null then raise exception 'player not found'; end if;
  if v_from_mode <> 'economy' or v_to_mode <> 'economy' then
    raise exception 'transfers are between economy players only';
  end if;
  if v_bal < p_amount then raise exception 'insufficient balance'; end if;

  update players set balance = balance - p_amount where id = p_from;
  update players set balance = balance + p_amount where id = p_to;
  insert into transactions (player_id, counterparty, amount, type)
    values (p_from, p_to::text, -p_amount, 'transfer'),
           (p_to,   p_from::text, p_amount, 'transfer');
end $$;

-- ---------------------------------------------------------------------------
-- Self-managed wagers
-- ---------------------------------------------------------------------------
-- Escrow a player into a wager (deduct stake, hold in pot). Used by create+join.
create or replace function _escrow_into_wager(p_wager_id uuid, p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_stake int; v_mode player_mode; v_bal int;
begin
  select stake_per_player into v_stake from wagers where id = p_wager_id;
  select mode, balance into v_mode, v_bal from players where id = p_player_id for update;
  -- Casual players play for fun with no chips on the line.
  if v_mode <> 'economy' or v_stake = 0 then
    insert into wager_participants (wager_id, player_id) values (p_wager_id, p_player_id)
      on conflict do nothing;
    return;
  end if;
  if v_bal < v_stake then raise exception 'insufficient balance for stake'; end if;
  update players set balance = balance - v_stake where id = p_player_id;
  update wagers set pot_total = pot_total + v_stake where id = p_wager_id;
  insert into transactions (player_id, counterparty, amount, type, ref_id)
    values (p_player_id, 'pot', -v_stake, 'wager_escrow', p_wager_id);
  insert into wager_participants (wager_id, player_id) values (p_wager_id, p_player_id)
    on conflict do nothing;
end $$;

create or replace function create_wager(
  p_creator uuid, p_token text, p_game_type text, p_stake int, p_opponent_ids uuid[]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_opp uuid;
begin
  perform _verify_session(p_creator, p_token);
  if p_stake < 0 then raise exception 'stake cannot be negative'; end if;
  insert into wagers (game_type, creator_id, stake_per_player)
    values (p_game_type, p_creator, p_stake) returning id into v_id;
  perform _escrow_into_wager(v_id, p_creator);
  -- Optionally pre-invite specific opponents (they still confirm by being escrowed now).
  if p_opponent_ids is not null then
    foreach v_opp in array p_opponent_ids loop
      if v_opp <> p_creator then perform _escrow_into_wager(v_id, v_opp); end if;
    end loop;
  end if;
  return v_id;
end $$;

create or replace function join_wager(p_player uuid, p_token text, p_wager_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_state wager_state;
begin
  perform _verify_session(p_player, p_token);
  select state into v_state from wagers where id = p_wager_id for update;
  if v_state <> 'open' then raise exception 'wager is not open to join'; end if;
  perform _escrow_into_wager(p_wager_id, p_player);
end $$;

-- Creator/admin closes the lobby; play begins in the real world.
create or replace function lock_wager(p_actor uuid, p_token text, p_wager_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_creator uuid; v_admin boolean; v_count int;
begin
  perform _verify_session(p_actor, p_token);
  select creator_id into v_creator from wagers where id = p_wager_id for update;
  select is_admin into v_admin from players where id = p_actor;
  if v_creator is null then raise exception 'wager not found'; end if;
  if p_actor <> v_creator and not coalesce(v_admin, false) then
    raise exception 'only the creator or an admin can lock this wager';
  end if;
  select count(*) into v_count from wager_participants where wager_id = p_wager_id;
  if v_count < 2 then raise exception 'need at least two participants'; end if;
  update wagers set state = 'locked' where id = p_wager_id and state = 'open';
end $$;

-- A participant reports the result. When all have reported we settle or dispute.
create or replace function report_wager(
  p_player uuid, p_token text, p_wager_id uuid, p_winner_id uuid, p_is_draw boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_total int; v_reported int; v_distinct_winners int; v_distinct_draw uuid;
  v_state wager_state;
begin
  perform _verify_session(p_player, p_token);
  select state into v_state from wagers where id = p_wager_id for update;
  if v_state not in ('locked', 'reported') then
    raise exception 'wager is not in a reportable state';
  end if;

  update wager_participants
     set has_confirmed_result = true,
         reported_winner_id = case when p_is_draw then null else p_winner_id end
   where wager_id = p_wager_id and player_id = p_player;

  select count(*) into v_total from wager_participants where wager_id = p_wager_id;
  select count(*) into v_reported from wager_participants
     where wager_id = p_wager_id and has_confirmed_result;
  if v_reported < v_total then
    update wagers set state = 'reported' where id = p_wager_id; -- partial, awaiting others
    return;
  end if;

  -- All reported: do they agree? Compare distinct (winner, is-draw) tuples.
  select count(distinct coalesce(reported_winner_id::text, 'DRAW'))
    into v_distinct_winners
    from wager_participants where wager_id = p_wager_id;
  if v_distinct_winners = 1 then
    -- Agreement. Record agreed result; settle_wager pays out.
    select reported_winner_id into v_distinct_draw
      from wager_participants where wager_id = p_wager_id limit 1;
    update wagers
       set state = 'reported',
           winner_id = v_distinct_draw,
           is_draw = (v_distinct_draw is null)
     where id = p_wager_id;
  else
    update wagers set state = 'disputed' where id = p_wager_id;
  end if;
end $$;

create or replace function settle_wager(
  p_actor uuid, p_token text, p_wager_id uuid, p_winner_id uuid, p_is_draw boolean
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_state wager_state; v_pot int; v_winner uuid; v_draw boolean;
  v_admin boolean; v_stake int; r record;
begin
  perform _verify_session(p_actor, p_token);
  select state, pot_total, winner_id, is_draw, stake_per_player
    into v_state, v_pot, v_winner, v_draw, v_stake
    from wagers where id = p_wager_id for update;
  select is_admin into v_admin from players where id = p_actor;

  if v_state = 'reported' then
    null; -- use agreed winner already stored
  elsif v_state = 'disputed' then
    if not coalesce(v_admin, false) then
      raise exception 'only an admin can settle a disputed wager';
    end if;
    v_winner := case when p_is_draw then null else p_winner_id end;
    v_draw := p_is_draw;
  else
    raise exception 'wager is not ready to settle';
  end if;

  if v_draw then
    -- Refund each economy participant their stake.
    for r in select player_id from wager_participants where wager_id = p_wager_id loop
      if exists (select 1 from players where id = r.player_id and mode = 'economy') and v_stake > 0 then
        update players set balance = balance + v_stake where id = r.player_id;
        insert into transactions (player_id, counterparty, amount, type, ref_id)
          values (r.player_id, 'pot', v_stake, 'refund', p_wager_id);
      end if;
    end loop;
  elsif v_winner is not null and v_pot > 0 then
    update players set balance = balance + v_pot where id = v_winner;
    insert into transactions (player_id, counterparty, amount, type, ref_id)
      values (v_winner, 'pot', v_pot, 'wager_payout', p_wager_id);
  end if;

  update wagers set state = 'settled', winner_id = v_winner, is_draw = v_draw, pot_total = 0
    where id = p_wager_id;
end $$;

create or replace function cancel_wager(p_actor uuid, p_token text, p_wager_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_state wager_state; v_stake int; v_admin boolean; r record;
begin
  perform _verify_session(p_actor, p_token);
  select state, stake_per_player into v_state, v_stake from wagers where id = p_wager_id for update;
  select is_admin into v_admin from players where id = p_actor;
  if v_state in ('settled', 'cancelled') then
    raise exception 'wager already finished';
  end if;
  if not exists (select 1 from wager_participants where wager_id = p_wager_id and player_id = p_actor)
     and not coalesce(v_admin, false) then
    raise exception 'only a participant or admin can cancel';
  end if;
  -- Refund all escrowed economy stakes.
  for r in select player_id from wager_participants where wager_id = p_wager_id loop
    if exists (select 1 from players where id = r.player_id and mode = 'economy') and v_stake > 0 then
      update players set balance = balance + v_stake where id = r.player_id;
      insert into transactions (player_id, counterparty, amount, type, ref_id)
        values (r.player_id, 'pot', v_stake, 'refund', p_wager_id);
    end if;
  end loop;
  update wagers set state = 'cancelled', pot_total = 0 where id = p_wager_id;
end $$;

-- ---------------------------------------------------------------------------
-- Dealer sessions (admin-run betting flow; no card engine)
-- ---------------------------------------------------------------------------
create or replace function open_dealer_session(
  p_actor uuid, p_token text, p_game_type text, p_buyin int
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform _require_admin(p_actor, p_token);
  if p_buyin < 0 then raise exception 'buyin cannot be negative'; end if;
  insert into dealer_sessions (game_type, buyin) values (p_game_type, p_buyin)
    returning id into v_id;
  return v_id;
end $$;

-- Economy players buy in from their real balance; casual players get a
-- ring-fenced throwaway table stack that exists ONLY inside this session.
create or replace function join_dealer_session(
  p_player uuid, p_token text, p_session_id uuid, p_casual_stack int
) returns void language plpgsql security definer set search_path = public as $$
declare v_state session_state; v_buyin int; v_mode player_mode; v_bal int; v_stack int;
begin
  perform _verify_session(p_player, p_token);
  select state, buyin into v_state, v_buyin from dealer_sessions where id = p_session_id for update;
  if v_state = 'closed' then raise exception 'session is closed'; end if;
  if exists (select 1 from dealer_session_players
             where session_id = p_session_id and player_id = p_player and not has_left) then
    raise exception 'already seated at this table';
  end if;
  select mode, balance into v_mode, v_bal from players where id = p_player for update;

  if v_mode = 'economy' then
    if v_bal < v_buyin then raise exception 'insufficient balance for buy-in'; end if;
    update players set balance = balance - v_buyin where id = p_player;
    insert into transactions (player_id, counterparty, amount, type, ref_id)
      values (p_player, 'table', -v_buyin, 'dealer_buyin', p_session_id);
    insert into dealer_session_players (session_id, player_id, is_casual, table_stack)
      values (p_session_id, p_player, false, v_buyin)
      on conflict (session_id, player_id)
      do update set has_left = false, is_casual = false, table_stack = v_buyin;
  else
    -- Casual: ring-fenced stack, no ledger entry, no persistent balance touched.
    v_stack := coalesce(p_casual_stack, v_buyin);
    insert into dealer_session_players (session_id, player_id, is_casual, table_stack)
      values (p_session_id, p_player, true, v_stack)
      on conflict (session_id, player_id)
      do update set has_left = false, is_casual = true, table_stack = v_stack;
  end if;
end $$;

-- Live per-action bet. Moves chips within the session (stack <-> pot) for both
-- economy and casual players uniformly. NOT ledgered (session-local).
create or replace function record_dealer_action(
  p_player uuid, p_token text, p_session_id uuid, p_action dealer_action_kind, p_amount int
) returns void language plpgsql security definer set search_path = public as $$
declare v_state session_state; v_hand int; v_stack int; v_amt int := coalesce(p_amount, 0);
begin
  perform _verify_session(p_player, p_token);
  select state, current_hand_no into v_state, v_hand from dealer_sessions where id = p_session_id for update;
  if v_state <> 'active' then raise exception 'no hand in progress'; end if;

  if p_action in ('bet', 'call', 'raise') then
    if v_amt <= 0 then raise exception 'amount required'; end if;
    select table_stack into v_stack from dealer_session_players
      where session_id = p_session_id and player_id = p_player for update;
    if v_stack is null then raise exception 'not seated at this table'; end if;
    if v_stack < v_amt then raise exception 'not enough chips in your stack'; end if;
    update dealer_session_players set table_stack = table_stack - v_amt
      where session_id = p_session_id and player_id = p_player;
    update dealer_sessions set pot_total = pot_total + v_amt where id = p_session_id;
  else
    v_amt := 0; -- check / fold move no chips
  end if;

  insert into dealer_actions (session_id, hand_no, player_id, action, amount)
    values (p_session_id, v_hand, p_player, p_action, v_amt);
end $$;

create or replace function start_dealer_hand(p_actor uuid, p_token text, p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin(p_actor, p_token);
  update dealer_sessions set state = 'active' where id = p_session_id and state in ('open', 'active');
end $$;

-- Admin awards the pot (or part of it) to a winner's table stack.
create or replace function payout_dealer(
  p_actor uuid, p_token text, p_session_id uuid, p_winner uuid, p_amount int
) returns void language plpgsql security definer set search_path = public as $$
declare v_pot int;
begin
  perform _require_admin(p_actor, p_token);
  select pot_total into v_pot from dealer_sessions where id = p_session_id for update;
  if p_amount <= 0 then raise exception 'amount must be positive'; end if;
  if v_pot < p_amount then raise exception 'pot does not have that many chips'; end if;
  -- Winner must be seated and not have left, or the chips would vanish.
  if not exists (
    select 1 from dealer_session_players
    where session_id = p_session_id and player_id = p_winner and not has_left
  ) then
    raise exception 'winner is not seated at this table';
  end if;
  update dealer_sessions set pot_total = pot_total - p_amount where id = p_session_id;
  update dealer_session_players set table_stack = table_stack + p_amount
    where session_id = p_session_id and player_id = p_winner;
end $$;

-- Advance to the next hand (resets nothing but the hand counter).
create or replace function next_dealer_hand(p_actor uuid, p_token text, p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin(p_actor, p_token);
  update dealer_sessions set current_hand_no = current_hand_no + 1, state = 'active'
    where id = p_session_id and state <> 'closed';
end $$;

-- Close the table. Economy players' remaining stacks return to their real
-- balance (ledgered). Casual stacks are discarded (never existed off-table).
create or replace function close_dealer_session(p_actor uuid, p_token text, p_session_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform _require_admin(p_actor, p_token);
  for r in select player_id, is_casual, table_stack from dealer_session_players
           where session_id = p_session_id and not has_left loop
    if not r.is_casual and r.table_stack > 0 then
      update players set balance = balance + r.table_stack where id = r.player_id;
      insert into transactions (player_id, counterparty, amount, type, ref_id)
        values (r.player_id, 'table', r.table_stack, 'dealer_payout', p_session_id);
    end if;
    update dealer_session_players set table_stack = 0, has_left = true
      where session_id = p_session_id and player_id = r.player_id;
  end loop;
  update dealer_sessions set state = 'closed', pot_total = 0 where id = p_session_id;
end $$;

-- ---------------------------------------------------------------------------
-- Quests (honor system — immediate payout, no approval)
-- ---------------------------------------------------------------------------
create or replace function _pay_quest(p_quest_id uuid, p_player uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare q record; v_paid int; v_mode player_mode;
begin
  select * into q from quests where id = p_quest_id and active;
  if q is null then return false; end if;
  select mode into v_mode from players where id = p_player;
  if v_mode <> 'economy' then return false; end if; -- quests are an economy feature

  select count(*) into v_paid from quest_payouts where quest_id = p_quest_id and player_id = p_player;
  if q.repeatable then
    if q.repeat_cap is not null and v_paid >= q.repeat_cap then return false; end if;
  else
    if v_paid >= 1 then return false; end if;
  end if;

  update players set balance = balance + q.reward where id = p_player;
  insert into transactions (player_id, counterparty, amount, type, ref_id)
    values (p_player, 'quest', q.reward, 'quest_reward', p_quest_id);
  insert into quest_payouts (quest_id, player_id, amount) values (p_quest_id, p_player, q.reward);
  return true;
end $$;

create or replace function claim_quest(p_player uuid, p_token text, p_quest_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  perform _verify_session(p_player, p_token);
  if not exists (select 1 from quests where id = p_quest_id and quest_type = 'claim') then
    raise exception 'not a claimable quest';
  end if;
  return _pay_quest(p_quest_id, p_player);
end $$;

-- Called by the app when it detects an auto-quest event for the current device.
create or replace function award_auto_quest(p_player uuid, p_token text, p_auto_key text)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_qid uuid;
begin
  perform _verify_session(p_player, p_token);
  select id into v_qid from quests where auto_key = p_auto_key and quest_type = 'auto' and active limit 1;
  if v_qid is null then return false; end if;
  return _pay_quest(v_qid, p_player);
end $$;

-- ---------------------------------------------------------------------------
-- Shop
-- ---------------------------------------------------------------------------
create or replace function buy_shop_item(p_player uuid, p_token text, p_item_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_mode player_mode; v_bal int; v_price int; v_order uuid;
begin
  perform _verify_session(p_player, p_token);
  select price into v_price from shop_items where id = p_item_id and active;
  if v_price is null then raise exception 'item not available'; end if;
  select mode, balance into v_mode, v_bal from players where id = p_player for update;

  if v_mode = 'economy' then
    if v_bal < v_price then raise exception 'insufficient balance'; end if;
    update players set balance = balance - v_price where id = p_player;
    insert into transactions (player_id, counterparty, amount, type, ref_id)
      values (p_player, 'shop', -v_price, 'shop_purchase', p_item_id);
    insert into shop_orders (item_id, player_id, is_free) values (p_item_id, p_player, false)
      returning id into v_order;
  else
    -- Casual: free. Ticket only, zero chips, no ledger entry.
    insert into shop_orders (item_id, player_id, is_free) values (p_item_id, p_player, true)
      returning id into v_order;
  end if;
  return jsonb_build_object('order_id', v_order, 'free', v_mode <> 'economy');
end $$;

-- ---------------------------------------------------------------------------
-- Mode switching (park / restore balance)
-- ---------------------------------------------------------------------------
create or replace function set_player_mode(p_player uuid, p_token text, p_new_mode player_mode)
returns void language plpgsql security definer set search_path = public as $$
declare v_mode player_mode; v_bal int; v_parked int; v_start int; v_seeded boolean;
begin
  perform _verify_session(p_player, p_token);
  select mode, balance, parked_balance, has_seeded into v_mode, v_bal, v_parked, v_seeded
    from players where id = p_player for update;
  if v_mode = p_new_mode then return; end if;

  if p_new_mode = 'casual' then
    -- Park the running balance out of sight.
    if v_bal > 0 then
      insert into transactions (player_id, counterparty, amount, type)
        values (p_player, 'admin', -v_bal, 'mode_park');
    end if;
    update players set parked_balance = parked_balance + v_bal, balance = 0, mode = 'casual'
      where id = p_player;
  else
    -- Going economy. Restore parked chips first.
    if v_parked > 0 then
      insert into transactions (player_id, counterparty, amount, type)
        values (p_player, 'admin', v_parked, 'mode_unpark');
      update players set balance = balance + v_parked, parked_balance = 0, mode = 'economy'
        where id = p_player;
    elsif not v_seeded then
      -- First time ever becoming economy: grant the standard starting balance.
      select starting_balance into v_start from settings where id = 1;
      insert into transactions (player_id, counterparty, amount, type)
        values (p_player, 'admin', v_start, 'mode_unpark');
      update players set balance = v_start, has_seeded = true, mode = 'economy' where id = p_player;
    else
      -- Already seeded and nothing parked (e.g. they busted out). No free reset.
      update players set mode = 'economy' where id = p_player;
    end if;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function admin_grant_chips(p_actor uuid, p_token text, p_target uuid, p_amount int)
returns void language plpgsql security definer set search_path = public as $$
declare v_mode player_mode;
begin
  perform _require_admin(p_actor, p_token);
  if p_amount = 0 then return; end if;
  select mode into v_mode from players where id = p_target for update;
  if v_mode <> 'economy' then raise exception 'target has no balance (casual player)'; end if;
  if (select balance from players where id = p_target) + p_amount < 0 then
    raise exception 'grant would make balance negative';
  end if;
  update players set balance = balance + p_amount where id = p_target;
  insert into transactions (player_id, counterparty, amount, type)
    values (p_target, 'admin', p_amount, 'admin_grant');
end $$;

create or replace function admin_fulfil_order(p_actor uuid, p_token text, p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin(p_actor, p_token);
  update shop_orders set state = 'fulfilled' where id = p_order_id;
end $$;

create or replace function admin_update_settings(
  p_actor uuid, p_token text, p_starting int, p_wager int, p_buyin int, p_leaderboard boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin(p_actor, p_token);
  update settings set
    starting_balance    = coalesce(p_starting, starting_balance),
    default_wager_stake = coalesce(p_wager, default_wager_stake),
    default_buyin       = coalesce(p_buyin, default_buyin),
    leaderboard_visible = coalesce(p_leaderboard, leaderboard_visible)
  where id = 1;
end $$;

create or replace function admin_save_shop_item(
  p_actor uuid, p_token text, p_id uuid, p_name text, p_price int, p_emoji text, p_active boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform _require_admin(p_actor, p_token);
  if p_id is null then
    insert into shop_items (name, price, emoji, active)
      values (p_name, p_price, coalesce(p_emoji, '🍸'), coalesce(p_active, true))
      returning id into v_id;
  else
    update shop_items set name = p_name, price = p_price,
      emoji = coalesce(p_emoji, emoji), active = coalesce(p_active, active)
      where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function admin_save_quest(
  p_actor uuid, p_token text, p_id uuid, p_title text, p_description text,
  p_reward int, p_active boolean
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform _require_admin(p_actor, p_token);
  if p_id is null then
    insert into quests (title, description, reward, quest_type, active)
      values (p_title, p_description, p_reward, 'claim', coalesce(p_active, true))
      returning id into v_id; -- admin-created quests default to honor-system claim
  else
    update quests set title = p_title, description = p_description,
      reward = p_reward, active = coalesce(p_active, active)
      where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

-- Wipe the night: players + all their activity. Keeps quests, shop, settings.
create or replace function reset_all(p_actor uuid, p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform _require_admin(p_actor, p_token);
  delete from dealer_actions;
  delete from dealer_session_players;
  delete from dealer_sessions;
  delete from wager_participants;
  delete from wagers;
  delete from quest_payouts;
  delete from shop_orders;
  delete from transactions;
  delete from player_sessions;
  delete from players;
end $$;

-- ---------------------------------------------------------------------------
-- Lock down internal helpers: they must only be reachable via the public RPCs
-- above (which call them as the function owner). Without this, the shared anon
-- key could invoke e.g. _pay_quest directly to pay arbitrary players.
-- ---------------------------------------------------------------------------
revoke execute on function _verify_session(uuid, text)     from public;
revoke execute on function _require_admin(uuid, text)      from public;
revoke execute on function _escrow_into_wager(uuid, uuid)  from public;
revoke execute on function _pay_quest(uuid, uuid)          from public;
