import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { useShopItems } from '@/lib/queries'
import { api } from '@/lib/api'
import { ChipCount, Spinner } from '@/components/ui'
import { useConfirm } from '@/components/useConfirm'
import { useToast, errMessage } from '@/components/Toast'
import type { ShopItem } from '@/lib/types'

export default function Shop() {
  const { player, token } = usePlayer()
  const { data: items, isLoading } = useShopItems()
  const qc = useQueryClient()
  const toast = useToast()
  const { ask, Dialog } = useConfirm()

  if (isLoading) return <Spinner />
  if (!player) return null
  const economy = player.mode === 'economy'
  const active = (items ?? []).filter((i) => i.active)

  const order = (item: ShopItem) => {
    const after =
      economy && player.balance < item.price ? null : undefined
    if (after === null) return toast.error('Not enough chips for that')

    ask({
      title: economy ? `Buy ${item.name}` : `Request ${item.name}`,
      detail: economy ? (
        <>
          Buy <span className="font-semibold">{item.name}</span> for{' '}
          <span className="font-display text-gold-300">{item.price}</span> chips?
        </>
      ) : (
        <>
          Send a <span className="font-semibold">{item.name}</span> request to the bar? It's free.
        </>
      ),
      confirmLabel: economy ? `Buy (${item.price})` : 'Request',
      onConfirm: async () => {
        try {
          await api.buyShopItem(player.id, token, item.id)
          // 'Cheers' auto-quest fires the first time an economy player buys a drink.
          if (economy) await api.awardAutoQuest(player.id, token, 'cheers').catch(() => {})
          toast.win(economy ? `Enjoy your ${item.name}!` : `${item.name} on the way!`)
          void qc.invalidateQueries()
        } catch (e) {
          toast.error(errMessage(e))
        }
      },
    })
  }

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between pt-1">
        <div>
          <h1 className="text-3xl text-gold-300">The Bar</h1>
          <p className="text-sm text-bone/70">
            {economy ? 'Spend chips on drinks & snacks.' : 'Everything is free — just ask.'}
          </p>
        </div>
        {economy && (
          <div className="text-right">
            <p className="label">Balance</p>
            <ChipCount value={player.balance} className="text-xl text-gold-300" />
          </div>
        )}
      </header>

      <div className="grid grid-cols-2 gap-3">
        {active.map((item) => (
          <button
            key={item.id}
            onClick={() => order(item)}
            className="deco-card flex flex-col items-center gap-1 p-4 text-center transition active:scale-[0.98]"
          >
            <span className="text-3xl">{item.emoji}</span>
            <span className="font-semibold text-bone">{item.name}</span>
            {economy ? (
              <span className="font-display text-gold-300">{item.price} chips</span>
            ) : (
              <span className="text-sm text-jade">Free</span>
            )}
          </button>
        ))}
      </div>

      <p className="px-4 text-center text-xs text-bone/60">
        Drinks are real and free either way — chips are just the in-game cost for economy players.
      </p>

      {Dialog}
    </div>
  )
}
