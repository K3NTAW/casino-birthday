import { QRCodeSVG } from 'qrcode.react'

/** Encodes a player id so another phone can scan it on the Send screen. */
export function PlayerQR({ value, size = 168 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-xl bg-bone p-3">
      <QRCodeSVG
        value={`casinonight:player:${value}`}
        size={size}
        bgColor="#f4efe1"
        fgColor="#0a0f0d"
        level="M"
      />
    </div>
  )
}

/** Pull a player id out of a scanned QR payload (tolerates a raw uuid too). */
export function parsePlayerQR(raw: string): string | null {
  const m = raw.match(/casinonight:player:([0-9a-fA-F-]{36})/)
  if (m) return m[1]
  if (/^[0-9a-fA-F-]{36}$/.test(raw.trim())) return raw.trim()
  return null
}
