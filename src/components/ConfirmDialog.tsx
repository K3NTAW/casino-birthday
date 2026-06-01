import { useState, type ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  /** The exact chip consequence, restated. e.g. "Send 50 chips to Anna?" */
  detail: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

/**
 * Mandatory gate before any chip move (Section 8). Restates the exact amount
 * and recipient so a tipsy mis-tap can't silently move chips.
 */
export function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel = 'Confirm',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  if (!open) return null

  const run = async () => {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCancel}
    >
      <div
        className="deco-card animate-chip-pop w-full max-w-sm p-6 safe-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl text-gold-300">{title}</h2>
        <div className="deco-divider my-4" />
        <div className="mb-6 text-lg leading-relaxed text-bone">{detail}</div>
        <div className="flex gap-3">
          <button className="btn-ghost flex-1" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            className={(danger ? 'btn-danger' : 'btn-gold') + ' flex-1'}
            onClick={run}
            disabled={busy}
          >
            {busy ? '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
