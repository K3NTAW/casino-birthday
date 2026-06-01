-- ============================================================================
-- Casino Night — lock down internal SECURITY DEFINER helpers (security fix)
--
-- Supabase grants EXECUTE to the anon/authenticated roles DIRECTLY (not only
-- via PUBLIC), so the `revoke ... from public` at the end of 0002 was NOT
-- enough: the internal helpers stayed callable straight from the shared anon
-- key over PostgREST RPC. Most dangerous was _pay_quest — a SECURITY DEFINER
-- function with NO session check — which any guest could call via
-- /rest/v1/rpc/_pay_quest to credit arbitrary chips to any player.
--
-- Revoke from every client-facing role explicitly. The public RPCs that call
-- these helpers run as the function owner, so they are unaffected.
-- ============================================================================
revoke execute on function _verify_session(uuid, text)      from public, anon, authenticated;
revoke execute on function _require_admin(uuid, text)       from public, anon, authenticated;
revoke execute on function _escrow_into_wager(uuid, uuid)   from public, anon, authenticated;
revoke execute on function _pay_quest(uuid, uuid)           from public, anon, authenticated;

-- Hygiene: pin search_path on the one helper that lacked it.
alter function _gen_player_code() set search_path = public;
