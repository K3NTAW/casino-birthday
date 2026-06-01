import { useCallback, useState, type ReactNode } from 'react'
import { ConfirmDialog } from './ConfirmDialog'

interface ConfirmRequest {
  title: string
  detail: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
}

/**
 * Ergonomic single-dialog confirm. Returns an `ask(...)` opener and the
 * `<Dialog/>` node to render once near the page root.
 */
export function useConfirm() {
  const [req, setReq] = useState<ConfirmRequest | null>(null)

  const ask = useCallback((r: ConfirmRequest) => setReq(r), [])
  const close = useCallback(() => setReq(null), [])

  const Dialog = (
    <ConfirmDialog
      open={!!req}
      title={req?.title ?? ''}
      detail={req?.detail}
      confirmLabel={req?.confirmLabel}
      danger={req?.danger}
      onCancel={close}
      onConfirm={async () => {
        await req?.onConfirm()
        close()
      }}
    />
  )

  return { ask, Dialog }
}
