import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import {
  usePlayers,
  useShopItems,
  useShopOrders,
  useQuests,
  useActivity,
  useSettings,
  useRealtime,
  keys,
} from '@/lib/queries'
import { api } from '@/lib/api'
import { Pill, SectionTitle } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'
import type { Quest, ShopItem, TxnType } from '@/lib/types'

interface ShopSave {
  id: string | null
  name: string
  price: number
  emoji: string
  active: boolean
}

export default function Admin() {
  const { player, token } = usePlayer()
  const qc = useQueryClient()
  const toast = useToast()
  const nav = useNavigate()
  const { ask, Dialog } = useConfirm()

  const { data: players = [] } = usePlayers()
  const { data: orders = [] } = useShopOrders()
  const { data: items = [] } = useShopItems()
  const { data: quests = [] } = useQuests()
  const { data: activity = [] } = useActivity()
  const { data: settings } = useSettings()

  useRealtime(['shop_orders', 'players', 'transactions'], (c) => {
    void c.invalidateQueries({ queryKey: keys.shopOrders })
    void c.invalidateQueries({ queryKey: keys.players })
    void c.invalidateQueries({ queryKey: keys.activity })
  })

  const itemName = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const playerName = useMemo(() => new Map(players.map((p) => [p.id, p])), [players])
  if (!player) return null

  const wrap = async (fn: () => Promise<unknown>, okMsg?: string) => {
    try {
      await fn()
      if (okMsg) toast.win(okMsg)
      void qc.invalidateQueries()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }

  const pending = orders.filter((o) => o.state === 'pending')
  const economyPlayers = players.filter((p) => p.mode === 'economy')

  return (
    <div className="space-y-6 pb-4">
      <header className="pt-1">
        <h1 className="text-3xl text-gold-300">Host panel</h1>
        <p className="text-sm text-bone/70">Run the night. Quests are honor-system — no approvals here.</p>
      </header>

      {/* 1. Fulfilment queue */}
      <section>
        <SectionTitle right={pending.length ? <Pill tone="ruby">{pending.length} waiting</Pill> : undefined}>
          Bar tickets
        </SectionTitle>
        <div className="space-y-2">
          {pending.length === 0 && <p className="text-sm text-bone/70">All caught up. 🍸</p>}
          {pending.map((o) => {
            const it = itemName.get(o.item_id)
            const who = playerName.get(o.player_id)
            return (
              <div key={o.id} className="deco-card flex items-center gap-3 p-3">
                <span className="text-2xl">{it?.emoji ?? '🍸'}</span>
                <div className="flex-1">
                  <p className="font-semibold text-bone">{it?.name ?? 'Item'}</p>
                  <p className="text-xs text-bone/60">
                    for {who?.display_name ?? '—'} · {o.is_free ? 'free (casual)' : `${it?.price ?? 0} chips`}
                  </p>
                </div>
                <button
                  className="btn-gold px-3 py-2 text-sm"
                  onClick={() => wrap(() => api.adminFulfilOrder(player.id, token, o.id))}
                >
                  Done
                </button>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Grant chips */}
      <GrantChips
        players={economyPlayers}
        onGrant={(target, amount) =>
          wrap(() => api.adminGrantChips(player.id, token, target, amount), 'Chips granted')
        }
      />

      {/* 3. Dealer tables shortcut */}
      <section>
        <SectionTitle>Dealer tables</SectionTitle>
        <button className="btn-ghost w-full" onClick={() => nav('/games')}>
          Open / manage tables on the Games screen →
        </button>
      </section>

      {/* 4. Tunable numbers */}
      {settings && (
        <SettingsEditor
          starting={settings.starting_balance}
          wager={settings.default_wager_stake}
          buyin={settings.default_buyin}
          leaderboard={settings.leaderboard_visible}
          onSave={(st, wa, bu, lb) =>
            wrap(() => api.adminUpdateSettings(player.id, token, st, wa, bu, lb), 'Settings saved')
          }
        />
      )}

      {/* 5. Shop editor */}
      <ShopEditor
        items={items}
        onSave={(it) =>
          wrap(
            () => api.adminSaveShopItem(player.id, token, it.id, it.name, it.price, it.emoji, it.active),
            'Menu updated',
          )
        }
      />

      {/* 6. Quest editor */}
      <QuestEditor
        quests={quests}
        onSave={(q) =>
          wrap(
            () => api.adminSaveQuest(player.id, token, q.id, q.title, q.description, q.reward, q.active),
            'Quest saved',
          )
        }
      />

      {/* 7. Activity log */}
      <section>
        <SectionTitle>Activity log</SectionTitle>
        <div className="deco-card max-h-72 space-y-1 overflow-y-auto p-3 text-sm">
          {activity.slice(0, 80).map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <span className={t.amount >= 0 ? 'text-jade' : 'text-ruby'}>
                {t.amount >= 0 ? '+' : ''}
                {t.amount}
              </span>
              <span className="text-bone/70">{playerName.get(t.player_id)?.display_name ?? '—'}</span>
              <span className="text-bone/60">{txnLabel(t.type)}</span>
            </div>
          ))}
          {activity.length === 0 && <p className="text-bone/70">Nothing yet.</p>}
        </div>
      </section>

      {/* 8. Reset */}
      <section>
        <SectionTitle>Danger zone</SectionTitle>
        <button
          className="btn-danger w-full"
          onClick={() =>
            ask({
              title: 'Reset everything?',
              detail:
                'Wipes ALL players, balances, wagers, tables, tickets and history. Keeps the shop menu, quests and settings. This cannot be undone.',
              danger: true,
              confirmLabel: 'Wipe it all',
              onConfirm: () =>
                wrap(async () => {
                  await api.resetAll(player.id, token)
                  // This device's player is gone too — bounce to login.
                  nav('/')
                  location.reload()
                }),
            })
          }
        >
          Reset everything
        </button>
      </section>

      {Dialog}
    </div>
  )
}

function txnLabel(t: TxnType): string {
  return t.replace(/_/g, ' ')
}

function GrantChips({
  players,
  onGrant,
}: {
  players: { id: string; display_name: string; avatar: string }[]
  onGrant: (target: string, amount: number) => void
}) {
  const [target, setTarget] = useState('')
  const [amount, setAmount] = useState('')
  return (
    <section>
      <SectionTitle>Grant chips</SectionTitle>
      <div className="deco-card space-y-3 p-4">
        <select className="input" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">Pick an economy player…</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            inputMode="numeric"
            placeholder="Amount (− to remove)"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d-]/g, ''))}
          />
          <button
            className="btn-gold px-5"
            disabled={!target || !amount}
            onClick={() => {
              onGrant(target, parseInt(amount, 10) || 0)
              setAmount('')
            }}
          >
            Grant
          </button>
        </div>
      </div>
    </section>
  )
}

function SettingsEditor({
  starting,
  wager,
  buyin,
  leaderboard,
  onSave,
}: {
  starting: number
  wager: number
  buyin: number
  leaderboard: boolean
  onSave: (st: number, wa: number, bu: number, lb: boolean) => void
}) {
  const [st, setSt] = useState(String(starting))
  const [wa, setWa] = useState(String(wager))
  const [bu, setBu] = useState(String(buyin))
  const [lb, setLb] = useState(leaderboard)
  return (
    <section>
      <SectionTitle>Tunable numbers</SectionTitle>
      <div className="deco-card space-y-3 p-4">
        <NumberRow label="Starting balance" value={st} onChange={setSt} />
        <NumberRow label="Default wager stake" value={wa} onChange={setWa} />
        <NumberRow label="Default dealer buy-in" value={bu} onChange={setBu} />
        <label className="flex items-center justify-between">
          <span className="text-bone">Show leaderboard</span>
          <button
            onClick={() => setLb((v) => !v)}
            className={`h-7 w-12 rounded-full border transition ${
              lb ? 'border-gold-500 bg-gold-500/40' : 'border-bone/20 bg-felt-900'
            }`}
          >
            <span
              className={`block h-5 w-5 rounded-full bg-gold-300 transition ${lb ? 'translate-x-6' : 'translate-x-1'}`}
            />
          </button>
        </label>
        <button
          className="btn-gold w-full"
          onClick={() => onSave(parseInt(st) || 0, parseInt(wa) || 0, parseInt(bu) || 0, lb)}
        >
          Save settings
        </button>
      </div>
    </section>
  )
}

function NumberRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-bone/80">{label}</span>
      <input
        className="input w-28 text-right"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
      />
    </label>
  )
}

function ShopEditor({ items, onSave }: { items: ShopItem[]; onSave: (it: ShopSave) => void }) {
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newEmoji, setNewEmoji] = useState('🍸')
  return (
    <section>
      <SectionTitle>Shop menu</SectionTitle>
      <div className="deco-card space-y-2 p-4">
        {items.map((it) => (
          <ShopItemRow key={it.id} item={it} onSave={onSave} />
        ))}
        <div className="deco-divider my-2" />
        <div className="flex gap-2">
          <input className="input w-14 text-center" value={newEmoji} onChange={(e) => setNewEmoji(e.target.value)} />
          <input className="input flex-1" placeholder="New item" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <input
            className="input w-20"
            inputMode="numeric"
            placeholder="₵"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button
          className="btn-ghost w-full"
          disabled={!newName.trim()}
          onClick={() => {
            onSave({ id: null, name: newName, price: parseInt(newPrice) || 0, emoji: newEmoji, active: true })
            setNewName('')
            setNewPrice('')
            setNewEmoji('🍸')
          }}
        >
          + Add item
        </button>
      </div>
    </section>
  )
}

function ShopItemRow({ item, onSave }: { item: ShopItem; onSave: (it: ShopSave) => void }) {
  const [price, setPrice] = useState(String(item.price))
  return (
    <div className="flex items-center gap-2">
      <span className="text-xl">{item.emoji}</span>
      <span className="flex-1 truncate text-bone">{item.name}</span>
      <input
        className="input w-16 py-1 text-right text-sm"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))}
        onBlur={() => {
          if (parseInt(price) !== item.price) onSave({ ...item, id: item.id, price: parseInt(price) || 0 })
        }}
      />
      <button
        className={`rounded-lg border px-2 py-1 text-xs ${item.active ? 'border-jade/50 text-jade' : 'border-bone/20 text-bone/60'}`}
        onClick={() => onSave({ ...item, id: item.id, active: !item.active })}
      >
        {item.active ? 'on' : 'off'}
      </button>
    </div>
  )
}

function QuestEditor({ quests, onSave }: { quests: Quest[]; onSave: (q: Quest) => void }) {
  return (
    <section>
      <SectionTitle>Quests</SectionTitle>
      <div className="deco-card max-h-80 space-y-2 overflow-y-auto p-4">
        {quests.map((q) => (
          <div key={q.id} className="flex items-center gap-2">
            <Pill tone={q.quest_type === 'auto' ? 'muted' : 'gold'}>{q.quest_type}</Pill>
            <span className="flex-1 truncate text-sm text-bone">{q.title}</span>
            <span className="font-display text-sm text-gold-300">{q.reward}</span>
            <button
              className={`rounded-lg border px-2 py-1 text-xs ${q.active ? 'border-jade/50 text-jade' : 'border-bone/20 text-bone/60'}`}
              onClick={() => onSave({ ...q, active: !q.active })}
            >
              {q.active ? 'on' : 'off'}
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
