import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePlayer } from '@/context/PlayerContext'
import { useQuests, useQuestPayouts } from '@/lib/queries'
import { api } from '@/lib/api'
import { Pill, SectionTitle, Spinner } from '@/components/ui'
import { useToast, errMessage } from '@/components/Toast'
import type { Quest } from '@/lib/types'

export default function Quests() {
  const { player, token } = usePlayer()
  const { data: quests, isLoading } = useQuests()
  const { data: payouts = [] } = useQuestPayouts(player?.id ?? '')
  const qc = useQueryClient()
  const toast = useToast()

  const paidCount = useMemo(() => {
    const m = new Map<string, number>()
    for (const p of payouts) m.set(p.quest_id, (m.get(p.quest_id) ?? 0) + 1)
    return m
  }, [payouts])

  if (isLoading) return <Spinner />
  if (!player) return null

  const active = (quests ?? []).filter((q) => q.active)
  const autoQuests = active.filter((q) => q.quest_type === 'auto')
  const claimQuests = active.filter((q) => q.quest_type === 'claim')

  const isDone = (q: Quest) => {
    const n = paidCount.get(q.id) ?? 0
    if (q.repeatable) return q.repeat_cap != null && n >= q.repeat_cap
    return n >= 1
  }

  const claim = async (q: Quest) => {
    try {
      const ok = await api.claimQuest(player.id, token, q.id)
      if (ok) toast.win(`+${q.reward} chips — ${q.title}`)
      else toast.info('Already claimed')
      void qc.invalidateQueries()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }

  return (
    <div className="space-y-6">
      <header className="pt-1">
        <h1 className="text-3xl text-gold-300">Quests</h1>
        <p className="text-sm text-bone/70">
          Out of chips? Earn your way back in. Honor system — claim what you've done.
        </p>
      </header>

      <section>
        <SectionTitle>Earned automatically</SectionTitle>
        <div className="space-y-2">
          {autoQuests.map((q) => {
            const n = paidCount.get(q.id) ?? 0
            const done = isDone(q)
            return (
              <QuestCard key={q.id} quest={q} done={done}>
                {done ? (
                  <Pill tone="jade">✓ earned{q.repeatable ? ` ×${n}` : ''}</Pill>
                ) : (
                  <Pill tone="muted">auto</Pill>
                )}
              </QuestCard>
            )
          })}
        </div>
      </section>

      <section>
        <SectionTitle>Claim these</SectionTitle>
        <div className="space-y-2">
          {claimQuests.map((q) => {
            const n = paidCount.get(q.id) ?? 0
            const done = isDone(q)
            return (
              <QuestCard key={q.id} quest={q} done={done}>
                {done ? (
                  <Pill tone="jade">✓ done{q.repeatable ? ` ×${n}` : ''}</Pill>
                ) : (
                  <button className="btn-gold px-4 py-2 text-sm" onClick={() => claim(q)}>
                    Claim
                  </button>
                )}
              </QuestCard>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function QuestCard({
  quest,
  done,
  children,
}: {
  quest: Quest
  done: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`deco-card flex items-center gap-3 p-4 ${done ? 'opacity-60' : ''}`}>
      <div className="flex-1">
        <p className="font-semibold text-bone">{quest.title}</p>
        <p className="text-sm text-bone/70">{quest.description}</p>
        <p className="mt-1 font-display text-gold-300">+{quest.reward} chips</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}
