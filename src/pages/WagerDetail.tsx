import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { usePlayers, useRealtime, keys } from '@/lib/queries'
import { reads, api } from '@/lib/api'
import { Avatar, Pill, Spinner, EmptyState } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'
import { awardWagerAutoQuests } from '@/lib/autoQuests'
import { IconBack } from '@/components/icons'
import { gameLabel } from '@/lib/types'

export default function WagerDetail() {
  const { id = '' } = useParams()
  const { player, token, isAdmin } = usePlayer()
  const { data: players = [] } = usePlayers()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { ask, Dialog } = useConfirm()

  const wagerQ = useQuery({ queryKey: keys.wager(id), queryFn: () => reads.wager(id), enabled: !!id })
  const partsQ = useQuery({
    queryKey: keys.wagerParticipants(id),
    queryFn: () => reads.wagerParticipants(id),
    enabled: !!id,
  })

  const [resultPick, setResultPick] = useState<string | 'draw' | null>(null)

  useRealtime(
    ['wagers', 'wager_participants'],
    (c) => {
      void c.invalidateQueries({ queryKey: keys.wager(id) })
      void c.invalidateQueries({ queryKey: keys.wagerParticipants(id) })
    },
    [id],
  )

  const nameOf = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p]))
    return (pid: string | null) => (pid ? m.get(pid) : undefined)
  }, [players])

  if (wagerQ.isLoading) return <Spinner />
  const w = wagerQ.data
  if (!w || !player) return <EmptyState emoji="🃏" title="Wager not found" />
  const parts = partsQ.data ?? []
  const me = parts.find((p) => p.player_id === player.id)
  const amParticipant = !!me
  const isCreator = w.creator_id === player.id
  const allReported = parts.length > 0 && parts.every((p) => p.has_confirmed_result)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.wager(id) })
    void qc.invalidateQueries({ queryKey: keys.wagerParticipants(id) })
    void qc.invalidateQueries({ queryKey: keys.wagers })
    void qc.invalidateQueries({ queryKey: keys.players })
  }

  const doJoin = () =>
    ask({
      title: 'Join wager',
      detail:
        player.mode === 'economy' && w.stake_per_player > 0 ? (
          <>
            Stake <span className="font-display text-gold-300">{w.stake_per_player}</span> chips to
            join this {gameLabel(w.game_type)} wager? It's escrowed until the result.
          </>
        ) : (
          <>Join this {gameLabel(w.game_type)} game for fun? No chips on the line for you.</>
        ),
      confirmLabel: 'Join',
      onConfirm: async () => {
        try {
          await api.joinWager(player.id, token, w.id)
          toast.win('You’re in!')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })

  const doLock = async () => {
    try {
      await api.lockWager(player.id, token, w.id)
      toast.info('Locked — play your game!')
      invalidate()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }

  const doReport = () => {
    if (resultPick == null) return toast.error('Pick a result first')
    const isDraw = resultPick === 'draw'
    ask({
      title: 'Report result',
      detail: isDraw ? (
        <>Report this game as a <strong>draw</strong>? Stakes are returned.</>
      ) : (
        <>
          Report <strong>{nameOf(resultPick as string)?.display_name}</strong> as the winner? All
          players must agree before chips move.
        </>
      ),
      confirmLabel: 'Report',
      onConfirm: async () => {
        try {
          await api.reportWager(player.id, token, w.id, isDraw ? null : (resultPick as string), isDraw)
          toast.info('Result reported')
          setResultPick(null)
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  const doSettle = () =>
    ask({
      title: 'Pay out',
      detail: w.is_draw ? (
        <>Settle as a draw and refund every stake?</>
      ) : (
        <>
          Pay the <span className="font-display text-gold-300">{w.pot_total}</span>-chip pot to{' '}
          <strong>{nameOf(w.winner_id)?.display_name}</strong>?
        </>
      ),
      confirmLabel: 'Pay out',
      onConfirm: async () => {
        try {
          await api.settleWager(player.id, token, w.id, w.winner_id, w.is_draw)
          toast.win('Paid out!')
          invalidate()
          await awardWagerAutoQuests(player.id, token)
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })

  const doCancel = () =>
    ask({
      title: 'Cancel wager',
      detail: 'Cancel and refund all escrowed stakes?',
      danger: true,
      confirmLabel: 'Cancel wager',
      onConfirm: async () => {
        try {
          await api.cancelWager(player.id, token, w.id)
          toast.info('Wager cancelled, stakes refunded')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })

  // Admin dispute resolution
  const resolveDispute = (winnerId: string | null, isDraw: boolean) =>
    ask({
      title: 'Resolve dispute',
      detail: isDraw ? (
        <>Force a draw and refund stakes?</>
      ) : (
        <>Award the pot to <strong>{nameOf(winnerId)?.display_name}</strong>?</>
      ),
      confirmLabel: 'Resolve',
      onConfirm: async () => {
        try {
          await api.settleWager(player.id, token, w.id, winnerId, isDraw)
          toast.win('Dispute resolved')
          invalidate()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })

  return (
    <div className="space-y-5">
      <button
        className="inline-flex items-center gap-1 text-sm font-semibold text-bone/70 transition hover:text-gold-300"
        onClick={() => nav('/games')}
      >
        <IconBack className="h-4 w-4" /> Games
      </button>

      <header className="deco-card p-5 text-center">
        <div className="text-4xl">
          {/* eslint-disable-next-line */}
          {({ chess: '♟️', mario_party: '🎮', just_dance: '🕺', custom: '🎯' } as Record<string, string>)[w.game_type] ?? '🎯'}
        </div>
        <h1 className="mt-1 text-2xl text-gold-300">{gameLabel(w.game_type)}</h1>
        <div className="mt-2 flex items-center justify-center gap-2">
          <Pill tone={w.state === 'disputed' ? 'ruby' : w.state === 'settled' ? 'jade' : 'gold'}>
            {w.state}
          </Pill>
          <span className="text-sm text-bone/70">
            stake {w.stake_per_player} · pot {w.pot_total}
          </span>
        </div>
      </header>

      {/* Participants */}
      <section className="deco-card p-5">
        <p className="label mb-3">Players</p>
        <div className="space-y-2">
          {parts.map((p) => {
            const info = nameOf(p.player_id)
            const reportedName =
              p.has_confirmed_result &&
              (p.reported_winner_id ? nameOf(p.reported_winner_id)?.display_name : 'Draw')
            return (
              <div key={p.player_id} className="flex items-center gap-3">
                <Avatar emoji={info?.avatar ?? '🎲'} size="sm" />
                <span className="flex-1 font-semibold text-bone">
                  {info?.display_name ?? '—'}
                  {p.player_id === w.creator_id && <span className="ml-1 text-xs text-gold-400">host</span>}
                </span>
                {w.winner_id === p.player_id && w.state === 'settled' && <Pill tone="jade">winner 🏆</Pill>}
                {p.has_confirmed_result && w.state !== 'settled' && (
                  <Pill tone="muted">said: {reportedName}</Pill>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Actions by state */}
      {w.state === 'open' && (
        <section className="space-y-3">
          {!amParticipant && (
            <button className="btn-gold w-full" onClick={doJoin}>
              Join this wager
            </button>
          )}
          {(isCreator || isAdmin) && (
            <button className="btn-ghost w-full" onClick={doLock} disabled={parts.length < 2}>
              Lock & start playing {parts.length < 2 && '(need 2+)'}
            </button>
          )}
          {(amParticipant || isAdmin) && (
            <button className="btn-danger w-full" onClick={doCancel}>
              Cancel & refund
            </button>
          )}
        </section>
      )}

      {w.state === 'locked' && (
        <section className="deco-card space-y-3 p-5">
          <p className="label">Report the result</p>
          {amParticipant ? (
            <>
              <div className="grid grid-cols-1 gap-2">
                {parts.map((p) => {
                  const info = nameOf(p.player_id)
                  return (
                    <button
                      key={p.player_id}
                      onClick={() => setResultPick(p.player_id)}
                      className={`flex items-center gap-2 rounded-xl border p-3 ${
                        resultPick === p.player_id ? 'border-gold-500 bg-felt-600/50' : 'border-gold-500/15'
                      }`}
                    >
                      <Avatar emoji={info?.avatar ?? '🎲'} size="sm" />
                      <span className="flex-1 text-left font-semibold">{info?.display_name} won</span>
                      {resultPick === p.player_id && <span className="text-gold-400">✓</span>}
                    </button>
                  )
                })}
                <button
                  onClick={() => setResultPick('draw')}
                  className={`rounded-xl border p-3 font-semibold ${
                    resultPick === 'draw' ? 'border-gold-500 bg-felt-600/50' : 'border-gold-500/15'
                  }`}
                >
                  It was a draw
                </button>
              </div>
              <button className="btn-gold w-full" onClick={doReport}>
                {me?.has_confirmed_result ? 'Update my report' : 'Submit my report'}
              </button>
            </>
          ) : (
            <p className="text-sm text-bone/55">Only participants report the result.</p>
          )}
          {(amParticipant || isAdmin) && (
            <button className="btn-danger w-full" onClick={doCancel}>
              Cancel & refund
            </button>
          )}
        </section>
      )}

      {w.state === 'reported' && (
        <section className="deco-card space-y-3 p-5 text-center">
          {allReported ? (
            <>
              <p className="text-lg text-bone">
                Everyone agrees:{' '}
                <span className="text-gold-300">
                  {w.is_draw ? 'Draw' : `${nameOf(w.winner_id)?.display_name} wins`}
                </span>
              </p>
              <button className="btn-gold w-full" onClick={doSettle}>
                {w.is_draw ? 'Refund stakes' : `Pay out ${w.pot_total} chips`}
              </button>
            </>
          ) : (
            <p className="text-sm text-bone/55">
              Waiting for the other player(s) to confirm the result…
            </p>
          )}
        </section>
      )}

      {w.state === 'disputed' && (
        <section className="deco-card space-y-3 p-5">
          <Pill tone="ruby">Disputed</Pill>
          <p className="text-sm text-bone/60">
            Reports didn’t match. {isAdmin ? 'As host, set the result:' : 'A host will resolve this.'}
          </p>
          {isAdmin && (
            <div className="grid grid-cols-1 gap-2">
              {parts.map((p) => {
                const info = nameOf(p.player_id)
                return (
                  <button key={p.player_id} className="btn-ghost" onClick={() => resolveDispute(p.player_id, false)}>
                    {info?.display_name} wins the pot
                  </button>
                )
              })}
              <button className="btn-ghost" onClick={() => resolveDispute(null, true)}>
                Call it a draw
              </button>
            </div>
          )}
        </section>
      )}

      {w.state === 'settled' && (
        <section className="deco-card p-5 text-center">
          <p className="text-lg text-gold-300">
            {w.is_draw ? 'Draw — stakes refunded' : `🏆 ${nameOf(w.winner_id)?.display_name} took the pot`}
          </p>
        </section>
      )}

      {w.state === 'cancelled' && (
        <EmptyState emoji="↩️" title="Cancelled" sub="All stakes were refunded." />
      )}

      {Dialog}
    </div>
  )
}
