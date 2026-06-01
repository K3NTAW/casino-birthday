// Generates app icons (no image libraries) — a gold casino chip on emerald felt.
// Pure Node: hand-rolled PNG encoder via zlib. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const FELT = [10, 31, 23] // deep emerald
const FELT_DK = [8, 15, 13]
const GOLD = [212, 175, 55]
const GOLD_LT = [242, 221, 140]

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return ~c >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePNG(size, px) {
  // px: Uint8Array length size*size*4 (RGBA)
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  // rest zero (compression, filter, interlace)
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    px.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v
    })
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

function draw(size, { pad = 0.0 } = {}) {
  const px = new Uint8Array(size * size * 4)
  const cx = size / 2
  const cy = size / 2
  const R = (size / 2) * (1 - pad) // outer chip radius
  const set = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = a
  }
  // angular gold "dashes" around the chip edge (classic poker-chip look)
  const dash = (ang) => {
    const a = ((ang % 360) + 360) % 360
    return a % 45 < 22 // 8 dashes
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx
      const dy = y - cy
      const d = Math.sqrt(dx * dx + dy * dy)
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI
      if (d > R) {
        // background felt with subtle vertical gradient
        const t = y / size
        set(x, y, [
          Math.round(FELT_DK[0] + (FELT[0] - FELT_DK[0]) * t),
          Math.round(FELT_DK[1] + (FELT[1] - FELT_DK[1]) * t),
          Math.round(FELT_DK[2] + (FELT[2] - FELT_DK[2]) * t),
        ])
      } else if (d > R * 0.86) {
        set(x, y, dash(ang) ? GOLD : FELT) // dashed rim
      } else if (d > R * 0.78) {
        set(x, y, GOLD) // gold ring
      } else if (d > R * 0.34) {
        set(x, y, FELT) // inner felt
      } else if (d > R * 0.26) {
        set(x, y, GOLD) // inner ring
      } else {
        // center: filled gold diamond (deco spade-ish mark)
        const m = Math.abs(dx) + Math.abs(dy)
        set(x, y, m < R * 0.24 ? GOLD_LT : GOLD)
      }
    }
  }
  return px
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', encodePNG(192, draw(192)))
writeFileSync('public/icon-512.png', encodePNG(512, draw(512)))
// Maskable: keep art inside the safe zone with extra padding.
writeFileSync('public/icon-maskable-512.png', encodePNG(512, draw(512, { pad: 0.16 })))

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="#0a1f17"/>
  <circle cx="32" cy="32" r="22" fill="none" stroke="#d4af37" stroke-width="4" stroke-dasharray="9 6"/>
  <circle cx="32" cy="32" r="11" fill="none" stroke="#d4af37" stroke-width="3"/>
  <path d="M32 24 L40 32 L32 40 L24 32 Z" fill="#f2dd8c"/>
</svg>`
writeFileSync('public/favicon.svg', favicon)
writeFileSync('public/apple-touch-icon.png', encodePNG(192, draw(192, { pad: 0.1 })))

console.log('icons written to public/')
