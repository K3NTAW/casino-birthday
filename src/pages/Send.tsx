import { useMemo, useState } from 'react'
import { Scanner } from '@yudiel/react-qr-scanner'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { usePlayers } from '@/lib/queries'
import { api } from '@/lib/api'
import { parsePlayerQR } from '@/components/QR'
import { Avatar, ChipCount } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'
import type { Player } from '@/lib/types'

export default function Send() {
  const { player, token } = usePlayer()
  const { data: players = [] } = usePlayers()
  const qc = useQueryClient()
  const toast = useToast()
  const { ask, Dialog } = useConfirm()

  const [code, setCode] = useState('')
  const [recipient, setRecipient] = useState<Player | null>(null)
  const [amount, setAmount] = useState('')
  const [scanning, setScanning] = useState(false)

  const economyOthers = useMemo(
    () => players.filter((p) => p.id !== player?.id && p.mode === 'economy'),
    [players, player?.id],
  )

  if (!player) return null

  const resolveById = (id: string) => {
    const found = players.find((p) => p.id === id)
    if (!found) return toast.error('Player not found')
    if (found.mode !== 'economy')
      return toast.info(`${found.display_name} is playing casual — they don't collect chips 🎈`)
    setRecipient(found)
    setScanning(false)
  }

  const resolveByCode = (raw: string) => {
    const c = raw.trim().toUpperCase()
    const found = economyOthers.find((p) => p.player_code === c)
    if (!found) return toast.info("No chip-collecting player with that code (casual players play for free 🎈)")
    setRecipient(found)
  }

  const send = () => {
    const amt = parseInt(amount, 10)
    if (!recipient || !amt || amt <= 0) return toast.error('Enter a valid amount')
    if (amt > player.balance) return toast.error('Not enough chips')
    ask({
      title: 'Send chips',
      detail: (
        <>
          Send <span className="font-display text-gold-300">{amt.toLocaleString()}</span> chips to{' '}
          <span className="font-semibold">{recipient.display_name}</span>?
        </>
      ),
      confirmLabel: `Send ${amt}`,
      onConfirm: async () => {
        try {
          await api.transferChips(player.id, token, recipient.id, amt)
          toast.win(`Sent ${amt} to ${recipient.display_name}`)
          setRecipient(null)
          setAmount('')
          setCode('')
          void qc.invalidateQueries()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  return (
    <div className="space-y-5">
      <header className="pt-1">
        <h1 className="text-3xl text-gold-300">Send chips</h1>
        <p className="text-sm text-bone/70">
          You have <ChipCount value={player.balance} className="text-gold-300" /> chips.
        </p>
      </header>

      {!recipient ? (
        <>
          {/* Typed code — ALWAYS works, even with no camera. */}
          <section className="deco-card p-5">
            <label className="label">Recipient's player code</label>
            <div className="mt-2 flex gap-2">
              <input
                className="input flex-1 uppercase tracking-[0.3em]"
                placeholder="ABCD"
                value={code}
                maxLength={4}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button className="btn-gold px-5" onClick={() => resolveByCode(code)} disabled={code.length < 4}>
                Find
              </button>
            </div>
            <p className="mt-2 text-xs text-bone/60">
              Ask them to read their 4-character code from their Home screen.
            </p>
          </section>

          {/* Camera scan — convenience only. */}
          <section className="deco-card p-5">
            <div className="flex items-center justify-between">
              <span className="label">Or scan their QR</span>
              <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setScanning((s) => !s)}>
                {scanning ? 'Stop' : '📷 Scan'}
              </button>
            </div>
            {scanning && (
              <div className="mt-3 overflow-hidden rounded-xl border border-gold-500/30">
                <Scanner
                  onScan={(codes) => {
                    const raw = codes[0]?.rawValue
                    if (!raw) return
                    const id = parsePlayerQR(raw)
                    if (id) resolveById(id)
                    else toast.error('Not a Casino Night code')
                  }}
                  onError={() => toast.error('Camera unavailable — use the code instead')}
                  components={{ finder: false }}
                  styles={{ container: { width: '100%' } }}
                />
              </div>
            )}
          </section>

          {/* Tap a name directly */}
          {economyOthers.length > 0 && (
            <section className="deco-card p-5">
              <span className="label">Or pick a player</span>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {economyOthers.map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-gold-500/15 bg-felt-900/40 p-2.5 text-left active:scale-[0.99]"
                    onClick={() => setRecipient(p)}
                  >
                    <Avatar emoji={p.avatar} size="sm" />
                    <span className="flex-1 font-semibold text-bone">{p.display_name}</span>
                    <span className="text-xs tracking-widest text-bone/60">{p.player_code}</span>
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <section className="deco-card p-5">
          <div className="flex items-center gap-3">
            <Avatar emoji={recipient.avatar} />
            <div className="flex-1">
              <p className="font-display text-lg text-bone">{recipient.display_name}</p>
              <p className="text-xs tracking-widest text-bone/60">{recipient.player_code}</p>
            </div>
            <button className="text-sm text-bone/60 underline" onClick={() => setRecipient(null)}>
              change
            </button>
          </div>

          <label className="label mt-5 block">Amount</label>
          <input
            className="input mt-2 text-center font-display text-2xl tracking-wide"
            inputMode="numeric"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            autoFocus
          />
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[25, 50, 100, 250].map((q) => (
              <button
                key={q}
                className="btn-ghost py-2 text-sm"
                onClick={() => setAmount(String(q))}
              >
                {q}
              </button>
            ))}
          </div>

          <button className="btn-gold mt-5 w-full" onClick={send}>
            Send chips
          </button>
        </section>
      )}

      {Dialog}
    </div>
  )
}
