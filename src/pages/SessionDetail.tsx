import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { usePlayers, useSettings, useRealtime, keys } from '@/lib/queries'
import { reads, api } from '@/lib/api'
import { Avatar, ChipCount, Pill, Spinner, EmptyState, SectionTitle } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'
import { awardDealerWin } from '@/lib/autoQuests'
import { gameLabel, type DealerActionKind } from '@/lib/types'

export default function SessionDetail() {
  const { id = '' } = useParams()
  const { player, token, isAdmin } = usePlayer()
  const { data: players = [] } = usePlayers()
  const { data: settings } = useSettings()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { ask, Dialog } = useConfirm()

  const sessionQ = useQuery({ queryKey: keys.session(id), queryFn: () => reads.dealerSession(id), enabled: !!id })
  const seatsQ = useQuery({
    queryKey: keys.sessionPlayers(id),
    queryFn: () => reads.dealerSessionPlayers(id),
    enabled: !!id,
  })
  const actionsQ = useQuery({
    queryKey: keys.dealerActions(id),
    queryFn: () => reads.dealerActions(id),
    enabled: !!id,
  })

  const [amount, setAmount] = useState('')

  useRealtime(
    ['dealer_sessions', 'dealer_session_players', 'dealer_actions'],
    (c) => {
      void c.invalidateQueries({ queryKey: keys.session(id) })
      void c.invalidateQueries({ queryKey: keys.sessionPlayers(id) })
      void c.invalidateQueries({ queryKey: keys.dealerActions(id) })
    },
    [id],
  )

  const nameOf = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p]))
    return (pid: string) => m.get(pid)
  }, [players])

  if (sessionQ.isLoading) return <Spinner />
  const s = sessionQ.data
  if (!s || !player) return <EmptyState emoji="🃏" title="Table not found" />
  const seats = (seatsQ.data ?? []).filter((x) => !x.has_left)
  const mySeat = seats.find((x) => x.player_id === player.id)
  const actions = actionsQ.data ?? []

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.session(id) })
    void qc.invalidateQueries({ queryKey: keys.sessionPlayers(id) })
    void qc.invalidateQueries({ queryKey: keys.dealerActions(id) })
    void qc.invalidateQueries({ queryKey: keys.players })
  }

  const join = () => {
    const economy = player.mode === 'economy'
    ask({
      title: 'Sit down',
      detail: economy ? (
        <>
          Buy in for <span className="font-display text-gold-300">{s.buyin}</span> chips from your
          balance? Your remaining stack returns to you when you leave.
        </>
      ) : (
        <>
          Join with a <strong>{s.buyin}-chip table stack</strong> just for this table. It's not real
          chips — nothing follows you out when you leave.
        </>
      ),
      confirmLabel: 'Buy in',
      onConfirm: async () => {
        try {
          await api.joinDealerSession(player.id, token, s.id, economy ? null : s.buyin)
          toast.win('Seated! Good luck.')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  const act = (action: DealerActionKind) => {
    const amt = ['bet', 'call', 'raise'].includes(action) ? parseInt(amount, 10) || 0 : 0
    if (['bet', 'call', 'raise'].includes(action)) {
      if (amt <= 0) return toast.error('Enter an amount')
      if (mySeat && amt > mySeat.table_stack) return toast.error('Not enough in your stack')
    }
    const label = action === 'check' ? 'Check' : action === 'fold' ? 'Fold' : `${action} ${amt}`
    ask({
      title: 'Confirm action',
      detail:
        action === 'check' ? (
          <>Check (no chips)?</>
        ) : action === 'fold' ? (
          <>Fold this hand?</>
        ) : (
          <>
            {action[0].toUpperCase() + action.slice(1)}{' '}
            <span className="font-display text-gold-300">{amt}</span> chips into the pot?
          </>
        ),
      confirmLabel: label,
      onConfirm: async () => {
        try {
          await api.recordDealerAction(player.id, token, s.id, action, amt)
          setAmount('')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  // ---- Admin table controls ----
  const startHand = async () => {
    try {
      await api.startDealerHand(player.id, token, s.id)
      invalidate()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }
  const nextHand = async () => {
    try {
      await api.nextDealerHand(player.id, token, s.id)
      toast.info(`Hand #${s.current_hand_no + 1}`)
      invalidate()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }
  const payout = (winnerId: string) =>
    ask({
      title: 'Award pot',
      detail: (
        <>
          Pay the <span className="font-display text-gold-300">{s.pot_total}</span>-chip pot to{' '}
          <strong>{nameOf(winnerId)?.display_name}</strong>?
        </>
      ),
      confirmLabel: `Pay ${s.pot_total}`,
      onConfirm: async () => {
        try {
          await api.payoutDealer(player.id, token, s.id, winnerId, s.pot_total)
          toast.win('Pot awarded')
          invalidate()
          await awardDealerWin(winnerId, token) // best-effort; only works for own device
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  const close = () =>
    ask({
      title: 'Close the table',
      detail:
        'Economy players get their remaining stacks back as real chips. Casual stacks are discarded. Continue?',
      danger: true,
      confirmLabel: 'Close table',
      onConfirm: async () => {
        try {
          await api.closeDealerSession(player.id, token, s.id)
          toast.info('Table closed')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })

  return (
    <div className="space-y-5">
      <button className="text-sm text-bone/50" onClick={() => nav('/games')}>
        ← Games
      </button>

      {/* Table header — pot is the hero */}
      <header className="deco-card p-6 text-center">
        <h1 className="text-2xl text-gold-300">{gameLabel(s.game_type)}</h1>
        <div className="mt-1 flex items-center justify-center gap-2">
          <Pill tone={s.state === 'active' ? 'jade' : s.state === 'open' ? 'gold' : 'muted'}>{s.state}</Pill>
          <span className="text-sm text-bone/50">hand #{s.current_hand_no}</span>
        </div>
        <div className="mt-4">
          <p className="label">Pot</p>
          <ChipCount value={s.pot_total} className="text-5xl text-gold-300" />
        </div>
        {mySeat && (
          <p className="mt-3 text-sm text-bone/60">
            Your stack: <ChipCount value={mySeat.table_stack} className="text-gold-300" />
            {mySeat.is_casual && <span className="ml-1 text-xs text-bone/40">(table-only)</span>}
          </p>
        )}
      </header>

      {/* Join */}
      {!mySeat && s.state !== 'closed' && (
        <button className="btn-gold w-full" onClick={join}>
          {player.mode === 'economy' ? `Buy in (${s.buyin} chips)` : `Sit down (${s.buyin} table chips)`}
        </button>
      )}

      {/* Player betting controls */}
      {mySeat && s.state === 'active' && (
        <section className="deco-card space-y-3 p-5">
          <p className="label">Your move</p>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => act('check')}>
              Check
            </button>
            <button className="btn-danger" onClick={() => act('fold')}>
              Fold
            </button>
          </div>
          <input
            className="input text-center font-display text-xl"
            inputMode="numeric"
            placeholder="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          />
          <div className="grid grid-cols-3 gap-2">
            <button className="btn-gold" onClick={() => act('bet')}>
              Bet
            </button>
            <button className="btn-gold" onClick={() => act('call')}>
              Call
            </button>
            <button className="btn-gold" onClick={() => act('raise')}>
              Raise
            </button>
          </div>
        </section>
      )}
      {mySeat && s.state === 'open' && (
        <p className="text-center text-sm text-bone/50">Seated — waiting for the host to start the hand.</p>
      )}

      {/* Seats */}
      <section className="deco-card p-5">
        <SectionTitle>At the table</SectionTitle>
        <div className="space-y-2">
          {seats.map((seat) => {
            const info = nameOf(seat.player_id)
            return (
              <div key={seat.player_id} className="flex items-center gap-3">
                <Avatar emoji={info?.avatar ?? '🎲'} size="sm" />
                <span className="flex-1 font-semibold text-bone">
                  {info?.display_name ?? '—'}
                  {seat.is_casual && <span className="ml-1 text-xs text-bone/40">casual</span>}
                </span>
                <span className="font-display text-gold-300">{seat.table_stack}</span>
                {isAdmin && s.state === 'active' && s.pot_total > 0 && (
                  <button className="btn-gold px-2 py-1 text-xs" onClick={() => payout(seat.player_id)}>
                    win pot
                  </button>
                )}
              </div>
            )
          })}
          {seats.length === 0 && <p className="text-sm text-bone/50">No players seated yet.</p>}
        </div>
      </section>

      {/* Live action feed — the realtime requirement */}
      <section className="deco-card p-5">
        <SectionTitle right={<span className="text-xs text-bone/40">live</span>}>Action feed</SectionTitle>
        <div className="space-y-1.5">
          {actions.length === 0 && <p className="text-sm text-bone/50">No actions yet.</p>}
          {actions.map((a) => {
            const info = nameOf(a.player_id)
            return (
              <div key={a.id} className="flex items-center gap-2 text-sm">
                <span className="text-bone/40">#{a.hand_no}</span>
                <span className="font-semibold text-bone">{info?.display_name ?? '—'}</span>
                <span
                  className={
                    a.action === 'fold' ? 'text-ruby' : a.action === 'check' ? 'text-bone/60' : 'text-gold-300'
                  }
                >
                  {a.action}
                  {a.amount > 0 && ` ${a.amount}`}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Admin controls */}
      {isAdmin && s.state !== 'closed' && (
        <section className="deco-card space-y-3 p-5">
          <SectionTitle>Host controls</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {s.state === 'open' ? (
              <button className="btn-gold col-span-2" onClick={startHand} disabled={seats.length === 0}>
                Start the hand
              </button>
            ) : (
              <button className="btn-ghost" onClick={nextHand}>
                Next hand →
              </button>
            )}
            <button className="btn-danger" onClick={close}>
              Close table
            </button>
          </div>
          <p className="text-xs text-bone/40">
            Tap “win pot” next to a player to award the pot to them. Default buy-in is{' '}
            {settings?.default_buyin ?? 200}.
          </p>
        </section>
      )}

      {s.state === 'closed' && <EmptyState emoji="🔒" title="Table closed" sub="Stacks were returned." />}

      {Dialog}
    </div>
  )
}
