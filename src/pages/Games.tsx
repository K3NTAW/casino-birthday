import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { usePlayers, useSettings, useWagers, useDealerSessions, useRealtime, keys } from '@/lib/queries'
import { api } from '@/lib/api'
import { Avatar, Pill, SectionTitle } from '@/components/ui'
import { useToast, errMessage } from '@/components/Toast'
import { SELF_GAMES, DEALER_GAMES, gameLabel, type Player, type Wager } from '@/lib/types'

export default function Games() {
  const { player, token, isAdmin } = usePlayer()
  const { data: players = [] } = usePlayers()
  const { data: settings } = useSettings()
  const { data: wagers = [] } = useWagers()
  const { data: sessions = [] } = useDealerSessions()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()

  const [createGame, setCreateGame] = useState<string | null>(null)

  useRealtime(['wagers', 'wager_participants', 'dealer_sessions', 'dealer_session_players'], (c) => {
    void c.invalidateQueries({ queryKey: keys.wagers })
    void c.invalidateQueries({ queryKey: keys.sessions })
  })

  const playerName = useMemo(() => {
    const m = new Map(players.map((p) => [p.id, p]))
    return (id: string | null) => (id ? m.get(id)?.display_name ?? '—' : '—')
  }, [players])

  if (!player) return null
  const economy = player.mode === 'economy'

  const liveWagers = wagers.filter((w) => ['open', 'locked', 'reported', 'disputed'].includes(w.state))
  const liveSessions = sessions.filter((s) => s.state !== 'closed')

  const openDealer = async (gameType: string) => {
    try {
      const id = await api.openDealerSession(player.id, token, gameType, settings?.default_buyin ?? 200)
      void qc.invalidateQueries({ queryKey: keys.sessions })
      nav(`/games/session/${id}`)
    } catch (e) {
      toast.error(errMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-3xl text-gold-300">Games</h1>
        <p className="text-sm text-bone/70">
          {economy ? 'Bet chips or just play for fun.' : 'Jump into any game — no chips needed.'}
        </p>
      </header>

      {/* Self-managed games */}
      <section>
        <SectionTitle>You run these</SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {SELF_GAMES.map((g) => (
            <button
              key={g.key}
              onClick={() => setCreateGame(g.key)}
              className="deco-card flex flex-col items-center gap-1 p-4 active:scale-[0.98]"
            >
              <span className="text-3xl">{g.emoji}</span>
              <span className="font-semibold text-bone">{g.label}</span>
              <span className="text-xs text-bone/60">Create wager →</span>
            </button>
          ))}
        </div>
      </section>

      {/* Dealer games */}
      <section>
        <SectionTitle right={isAdmin ? <Pill tone="jade">you're a host</Pill> : undefined}>
          Host runs these
        </SectionTitle>
        <div className="grid grid-cols-2 gap-3">
          {DEALER_GAMES.map((g) => (
            <div key={g.key} className="deco-card flex flex-col items-center gap-1 p-4">
              <span className="text-3xl">{g.emoji}</span>
              <span className="font-semibold text-bone">{g.label}</span>
              {isAdmin ? (
                <button className="btn-gold mt-1 px-3 py-1.5 text-xs" onClick={() => openDealer(g.key)}>
                  Open table
                </button>
              ) : (
                <span className="text-xs text-bone/60">Wait for a host</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Live tables */}
      {liveSessions.length > 0 && (
        <section>
          <SectionTitle>Open tables</SectionTitle>
          <div className="space-y-2">
            {liveSessions.map((s) => (
              <button
                key={s.id}
                onClick={() => nav(`/games/session/${s.id}`)}
                className="deco-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]"
              >
                <span className="text-2xl">
                  {DEALER_GAMES.find((g) => g.key === s.game_type)?.emoji ?? '🃏'}
                </span>
                <div className="flex-1">
                  <p className="font-semibold text-bone">{gameLabel(s.game_type)}</p>
                  <p className="text-xs text-bone/60">
                    Buy-in {s.buyin} · pot {s.pot_total} · hand #{s.current_hand_no}
                  </p>
                </div>
                <Pill tone={s.state === 'active' ? 'jade' : 'gold'}>{s.state}</Pill>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Live wagers */}
      {liveWagers.length > 0 && (
        <section>
          <SectionTitle>Wagers in play</SectionTitle>
          <div className="space-y-2">
            {liveWagers.map((w) => (
              <WagerRow key={w.id} wager={w} creatorName={playerName(w.creator_id)} onOpen={() => nav(`/games/wager/${w.id}`)} />
            ))}
          </div>
        </section>
      )}

      {createGame && (
        <CreateWagerSheet
          gameType={createGame}
          defaultStake={settings?.default_wager_stake ?? 50}
          me={player}
          token={token}
          others={players.filter((p) => p.id !== player.id)}
          onClose={() => setCreateGame(null)}
          onCreated={(id) => {
            setCreateGame(null)
            void qc.invalidateQueries({ queryKey: keys.wagers })
            nav(`/games/wager/${id}`)
          }}
        />
      )}
    </div>
  )
}

function WagerRow({ wager, creatorName, onOpen }: { wager: Wager; creatorName: string; onOpen: () => void }) {
  const tone = wager.state === 'disputed' ? 'ruby' : wager.state === 'open' ? 'gold' : 'muted'
  return (
    <button onClick={onOpen} className="deco-card flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]">
      <span className="text-2xl">{SELF_GAMES.find((g) => g.key === wager.game_type)?.emoji ?? '🎯'}</span>
      <div className="flex-1">
        <p className="font-semibold text-bone">{gameLabel(wager.game_type)}</p>
        <p className="text-xs text-bone/60">
          by {creatorName} · stake {wager.stake_per_player} · pot {wager.pot_total}
        </p>
      </div>
      <Pill tone={tone}>{wager.state}</Pill>
    </button>
  )
}

function CreateWagerSheet({
  gameType,
  defaultStake,
  me,
  token,
  others,
  onClose,
  onCreated,
}: {
  gameType: string
  defaultStake: number
  me: Player
  token: string
  others: Player[]
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const toast = useToast()
  const [stake, setStake] = useState(String(defaultStake))
  const [picked, setPicked] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const economy = me.mode === 'economy'

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const create = async () => {
    const s = parseInt(stake, 10) || 0
    if (economy && s > me.balance) return toast.error('Stake exceeds your balance')
    setBusy(true)
    try {
      const id = await api.createWager(me.id, token, gameType, economy ? s : 0, picked)
      // High Roller auto-quest: a single wager of 200+ chips.
      if (economy && s >= 200) await api.awardAutoQuest(me.id, token, 'high_roller').catch(() => {})
      onCreated(id)
    } catch (e) {
      toast.error(errMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="deco-card w-full max-w-md p-5 safe-bottom" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl text-gold-300">New {gameLabel(gameType)} wager</h2>
        <div className="deco-divider my-3" />

        {economy ? (
          <>
            <label className="label">Stake per player</label>
            <input
              className="input mt-1.5 text-center font-display text-xl"
              inputMode="numeric"
              value={stake}
              onChange={(e) => setStake(e.target.value.replace(/\D/g, ''))}
            />
          </>
        ) : (
          <p className="text-sm text-bone/55">
            You're casual — this game is just for fun, no chips on the line.
          </p>
        )}

        <label className="label mt-4 block">Invite opponents (optional)</label>
        <p className="mb-2 text-xs text-bone/60">
          Or leave empty and let people tap “Join”. Casual players join for fun.
        </p>
        <div className="max-h-44 space-y-2 overflow-y-auto">
          {others.map((p) => (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left ${
                picked.includes(p.id) ? 'border-gold-500 bg-felt-600/50' : 'border-gold-500/15 bg-felt-900/40'
              }`}
            >
              <Avatar emoji={p.avatar} size="sm" />
              <span className="flex-1 font-semibold text-bone">{p.display_name}</span>
              <Pill tone={p.mode === 'economy' ? 'gold' : 'muted'}>{p.mode}</Pill>
              {picked.includes(p.id) && <span className="text-gold-400">✓</span>}
            </button>
          ))}
        </div>

        <div className="mt-5 flex gap-3">
          <button className="btn-ghost flex-1" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-gold flex-1" onClick={create} disabled={busy}>
            {busy ? '…' : economy ? `Create & stake ${parseInt(stake) || 0}` : 'Create game'}
          </button>
        </div>
        {economy && (
          <p className="mt-2 text-center text-xs text-bone/60">
            Your stake is escrowed now and refunded if the wager is cancelled.
          </p>
        )}
      </div>
    </div>
  )
}
