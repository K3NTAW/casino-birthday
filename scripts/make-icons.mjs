// Generates app icons (no image libraries) — a refined gold casino chip with a
// deco diamond on emerald felt. Anti-aliased via supersampling.
// Pure Node: hand-rolled PNG encoder via zlib. Run: node scripts/make-icons.mjs
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const FELT = [12, 38, 28] // emerald felt
const FELT_DK = [8, 15, 13] // dark edge
const FELT_RIM = [9, 26, 20] // rim gaps between gold spots
const FELT_SHEEN = [18, 52, 40] // inner-field sheen
const GOLD = [212, 175, 55]
const GOLD_DK = [160, 124, 30]
const GOLD_LT = [242, 221, 140]
const GOLD_HI = [247, 233, 179]

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
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    px.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v
    })
  }
  const idat = deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

const mix = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
const scale = (c, f) => [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)]

// Color at a floating-point coordinate — supersampling antialiases the bands.
function sampleRGB(fx, fy, size, pad) {
  const c = size / 2
  const R = (size / 2) * (1 - pad)
  const dx = fx - c
  const dy = fy - c
  const d = Math.hypot(dx, dy)
  const nd = d / R

  // Background felt: emerald glow at center fading to dark at the corners.
  if (nd > 1) {
    const vt = clamp(d / (size * 0.72), 0, 1)
    return mix(FELT, FELT_DK, vt)
  }

  // Spherical lighting — top of the chip catches more candlelight.
  const light = 1 + (-dy / R) * 0.12

  // Spotted gold rim (8 spots).
  if (nd > 0.84) {
    const a = ((((Math.atan2(dy, dx) * 180) / Math.PI) % 360) + 360) % 360
    const isSpot = a % 45 < 24
    return scale(isSpot ? GOLD : FELT_RIM, light)
  }
  // Outer gold ring.
  if (nd > 0.79) return scale(GOLD, light)
  // Inner felt field with a soft radial sheen toward the center.
  if (nd > 0.3) {
    const sheen = (0.79 - nd) / (0.79 - 0.3)
    let base = mix(FELT, FELT_SHEEN, sheen * 0.6)
    base = mix(base, GOLD_DK, sheen * 0.08)
    return scale(base, light)
  }
  // Inner gold ring.
  if (nd > 0.26) return scale(GOLD, light)

  // Center deco diamond with a top-left facet highlight and a thin dark edge.
  const m = (Math.abs(dx) + Math.abs(dy)) / R
  if (m < 0.205) {
    const ht = clamp((-dx - dy) / (R * 0.3), 0, 1)
    return scale(mix(GOLD, GOLD_HI, ht * 0.8), light)
  }
  if (m < 0.235) return scale(GOLD_DK, light)
  return scale(mix(FELT, FELT_SHEEN, 0.5), light)
}

function draw(size, { pad = 0 } = {}) {
  const SS = 4 // supersample factor for antialiasing
  const px = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0
      let g = 0
      let b = 0
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const [cr, cg, cb] = sampleRGB(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS, size, pad)
          r += cr
          g += cg
          b += cb
        }
      }
      const n = SS * SS
      const i = (y * size + x) * 4
      px[i] = Math.round(r / n)
      px[i + 1] = Math.round(g / n)
      px[i + 2] = Math.round(b / n)
      px[i + 3] = 255
    }
  }
  return px
}

mkdirSync('public', { recursive: true })
writeFileSync('public/icon-192.png', encodePNG(192, draw(192, { pad: 0.06 })))
writeFileSync('public/icon-512.png', encodePNG(512, draw(512, { pad: 0.06 })))
// Maskable: keep art inside the safe zone with extra padding.
writeFileSync('public/icon-maskable-512.png', encodePNG(512, draw(512, { pad: 0.2 })))
writeFileSync('public/apple-touch-icon.png', encodePNG(192, draw(192, { pad: 0.1 })))

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#0a1f17"/>
  <circle cx="32" cy="32" r="23" fill="none" stroke="#d4af37" stroke-width="3" stroke-dasharray="9 6.5"/>
  <circle cx="32" cy="32" r="12.5" fill="none" stroke="#d4af37" stroke-width="2.5"/>
  <path d="M32 23 L41 32 L32 41 L23 32 Z" fill="#f2dd8c"/>
</svg>`
writeFileSync('public/favicon.svg', favicon)

console.log('icons written to public/')
