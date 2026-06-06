-- ============================================================================
-- Casino Night — self-serve account reclaim
--
-- Problem: identity is a per-device session_token in localStorage. If a guest's
-- storage is wiped (iOS ITP eviction, "clear site data", reinstall), the token
-- is gone and the only way back in was to create a brand-new player — orphaning
-- their balance.
--
-- Fix: reclaim_player lets a guest get back into their existing row by proving
-- two semi-public factors — their 4-char player_code AND their display name.
-- This is NOT real authentication (both factors are visible in-app); it's the
-- party-appropriate "get me back in" path. The trust model is already
-- deliberately lightweight (see README) — a determined guest with another
-- player's code+name could already grief them.
--
-- On a match we ROTATE the session token: a fresh token is issued and the old
-- device's token stops working. One account = one active device.
--
-- Like create_player, this is anon-callable (the guest has no session yet).
-- ============================================================================
create or replace function reclaim_player(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid;
  v_token    text;
  v_mode     player_mode;
  v_balance  int;
  v_is_admin boolean;
begin
  if coalesce(trim(p_code), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'name and code required';
  end if;

  -- Case-insensitive match on both factors. player_code is uppercase by
  -- generation; names are matched loosely so casing/spaces don't lock people out.
  select id, mode, balance, is_admin
    into v_id, v_mode, v_balance, v_is_admin
    from players
   where upper(player_code) = upper(trim(p_code))
     and lower(display_name) = lower(trim(p_name));

  if v_id is null then
    raise exception 'no match — check your name and 4-char code'
      using errcode = '28000';
  end if;

  -- Rotate the device token (invalidates any stale device, issues a fresh one).
  v_token := gen_random_uuid()::text;
  insert into player_sessions (player_id, session_token)
    values (v_id, v_token)
    on conflict (player_id) do update set session_token = excluded.session_token;

  return jsonb_build_object(
    'id', v_id,
    'session_token', v_token,
    'mode', v_mode,
    'balance', v_balance,
    'is_admin', v_is_admin
  );
end $$;
