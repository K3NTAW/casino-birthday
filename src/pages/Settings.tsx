import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { api } from '@/lib/api'
import { Avatar, Pill } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'

export default function Settings() {
  const { player, token, isAdmin, tryAdmin, logout, refresh } = usePlayer()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { ask, Dialog } = useConfirm()
  const [adminCode, setAdminCode] = useState('')

  if (!player) return null
  const economy = player.mode === 'economy'

  const switchMode = () => {
    const to = economy ? 'casual' : 'economy'
    ask({
      title: economy ? 'Switch to Casual?' : 'Switch to Economy?',
      detail: economy ? (
        <>
          Your <span className="font-display text-gold-300">{player.balance.toLocaleString()}</span>{' '}
          chips will be <strong>parked</strong> and hidden. No balance, no leaderboard — just games
          and the free bar. Switch back anytime and your chips return.
        </>
      ) : player.parked_balance > 0 ? (
        <>
          You'll get your parked{' '}
          <span className="font-display text-gold-300">{player.parked_balance.toLocaleString()}</span>{' '}
          chips back and rejoin the full economy.
        </>
      ) : (
        <>You'll receive the standard starting balance and join the full economy.</>
      ),
      confirmLabel: economy ? 'Go Casual' : 'Go Economy',
      onConfirm: async () => {
        try {
          await api.setPlayerMode(player.id, token, to)
          await refresh()
          void qc.invalidateQueries()
          toast.win(economy ? 'Now in Casual mode' : 'Welcome to the economy!')
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  const becomeAdmin = async () => {
    const ok = await tryAdmin(adminCode)
    if (ok) toast.win('Host mode unlocked')
    else toast.error('Wrong host code')
    setAdminCode('')
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-3xl text-gold-300">Settings</h1>
      </header>

      <section className="deco-card flex items-center gap-3 p-5">
        <Avatar emoji={player.avatar} size="lg" />
        <div className="flex-1">
          <p className="font-display text-xl text-bone">{player.display_name}</p>
          <div className="mt-1 flex gap-2">
            <Pill tone={economy ? 'gold' : 'muted'}>{economy ? 'Economy' : 'Casual'}</Pill>
            {isAdmin && <Pill tone="jade">Host</Pill>}
          </div>
        </div>
      </section>

      <section className="deco-card p-5">
        <h2 className="text-lg text-gold-300">Player mode</h2>
        <p className="mt-1 text-sm text-bone/55">
          {economy
            ? 'You play the full chip economy. Switch to Casual to put the numbers away.'
            : 'You play for fun with no balance. Switch to Economy to bet, trade and earn.'}
        </p>
        <button className="btn-ghost mt-4 w-full" onClick={switchMode}>
          {economy ? 'Switch to Casual mode' : 'Switch to Economy mode'}
        </button>
      </section>

      {!isAdmin && (
        <section className="deco-card p-5">
          <h2 className="text-lg text-gold-300">Host access</h2>
          <p className="mt-1 text-sm text-bone/55">
            Got the host code? Enter it to run dealer tables and fulfil drinks.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              className="input flex-1"
              placeholder="Host code"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
            />
            <button className="btn-gold px-5" onClick={becomeAdmin} disabled={!adminCode.trim()}>
              Unlock
            </button>
          </div>
        </section>
      )}

      <button
        className="btn-danger w-full"
        onClick={() =>
          ask({
            title: 'Leave the party?',
            detail: 'This clears this device. Your chips stay safe on the server — rejoin with the same name to get a fresh device login (a new player row).',
            confirmLabel: 'Log out',
            danger: true,
            onConfirm: async () => {
              logout()
              nav('/')
            },
          })
        }
      >
        Log out of this device
      </button>

      <p className="px-4 text-center text-xs text-bone/60">
        Chips have no real-world value. This is a party game.
      </p>

      {Dialog}
    </div>
  )
}
