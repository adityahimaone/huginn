#!/usr/bin/env node
/**
 * Build the Huginn mark family from one cell module.
 *
 *   node scripts/build-brand.mjs
 *
 * Everything here is geometry: the H is cut from a 5x5 cell grid, the compact
 * H from 3x3, and the wordmark is the bitmap blackletter from the Wild Hunt
 * footer, decoded out of its packed hex and re-emitted as SVG paths. No font
 * file is read and no live text is used, so the logo cannot change when a font
 * fails to load.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')
const OUT = resolve(ROOT, 'brand')
mkdirSync(resolve(OUT, 'favicons'), { recursive: true })

/* ---------------------------------------------------------------- glyphs ---
   "<width>:<hex>", 22 rows, each row packed into ceil(width / 4) hex digits.
   Copied from components/ui/wild-hunt-footer.tsx — that file is the source. */
const GLYPHS = {
  A: '15:00000000000c00fc01fc003c003c083c183c183c183c183c303c3ffc303c303c303c303c3038e03080000000',
  D: '15:00000800dfc0ffe078f878787838781878187818781878187818781878187818781078007f807f0000000000',
  E: '14:000001e007f80ff810783000700070007000700071e073e0700070007000700078007c003fe01fc00f800000',
  G: '15:000001e007f80ff8107830007000700070007000700070fc701c701c701c701c78187c003fe01fc00f800000',
  H: '15:00000000d80cf81c783c783c783c783c783c7ffc7ffc783c783c783c783c783c7038603000000000',
  I: '10:0000407c05c01c01c81c01c01c01c81c01c01c01c01c01c01c01c03f0100000',
  K: '15:00000000d81cf838787078e078e079c07b807b007f007e007f007b807bc079e078f07878703c601800000000',
  L: '14:00000000d800f800780078007800780078007800780078007800780078007800780078007fe07fc000000000',
  M: '18:00000000006ff8057dc073ce073c6073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce0738e0630c04000000000',
  N: '15:00000000d80cf81c783c7c3c7c3c7e3c7e3c7f3c7b3c7bbc79fc78fc78fc787c787c783c7038603000000000',
  O: '15:0000000007f00ff8007c307c313c711c711c711c729c739c711c711c711c791c78187c103fe01fc000000000',
  R: '15:00000800dfe0fff0787878387818781878187818780078007f807fc079e078e078707878703c601800000000',
  S: '14:0000000007f00ff8107030003000300038003e001fc00ff000f8007800380018001838107fc03fc000000000',
  T: '15:000000803ffc7ff803800380038003800380038003800380038003800380038003800380038007000e000000',
  U: '15:00000000d80cf81c783c783c783c783c783c783c783c783c783c783c7c3c3c3c3e3c1ff80ff00f800000',
  V: '15:00000000d008f01870187018701870187018701870187018701878187c107e003e001f000f80070000000000',
  '&': '15:000000000f801f8031c031c030803180390038001c000e000700238023c861f070f070783ebc1f1800000000',
  '.': '4:000000000000000004f640',
  '-': '8:000000000000000000003e7c00000000000000000000',
}

const ROWS = 22

function decode(packed) {
  const i = packed.indexOf(':')
  const w = parseInt(packed.slice(0, i), 10)
  const hex = packed.slice(i + 1)
  const nd = (w + 3) >> 2
  const rows = []
  for (let r = 0; r < ROWS; r++) {
    const v = parseInt(hex.slice(r * nd, (r + 1) * nd) || '0', 16)
    let s = ''
    for (let c = 0; c < w; c++) s += (v >> (nd * 4 - 1 - c)) & 1 ? '#' : '.'
    rows.push(s)
  }
  return { w, rows }
}

/** Lay a word on the cell grid. Lowercase is set as capitals; space is 6 cells. */
function compose(word, tracking) {
  const cells = []
  let x = 0
  for (const ch of word.toUpperCase()) {
    if (ch === ' ') {
      x += 6 + tracking
      continue
    }
    const g = GLYPHS[ch] ? decode(GLYPHS[ch]) : null
    if (!g) continue
    g.rows.forEach((row, r) => {
      for (let c = 0; c < g.w; c++) if (row[c] === '#') cells.push([x + c, r])
    })
    x += g.w + tracking
  }
  return { cols: Math.max(0, x - tracking), cells }
}

/** Merge horizontal runs so one path carries the whole drawing. */
function runsToPath(cells, cell, gap, ox = 0, oy = 0, rowMin = 0) {
  const byRow = new Map()
  for (const [x, y] of cells) {
    if (y < rowMin) continue
    if (!byRow.has(y)) byRow.set(y, [])
    byRow.get(y).push(x)
  }
  let d = ''
  for (const [y, xs] of [...byRow.entries()].sort((a, b) => a[0] - b[0])) {
    xs.sort((a, b) => a - b)
    let start = xs[0]
    let prev = xs[0]
    for (let i = 1; i <= xs.length; i++) {
      if (i < xs.length && xs[i] === prev + 1) {
        prev = xs[i]
        continue
      }
      const n = prev - start + 1
      const x = ox + start * (cell + gap)
      const w = n * cell + (n - 1) * gap
      const yy = oy + (y - rowMin) * (cell + gap)
      d += `M${x} ${yy}h${w}v${cell}h${-w}z`
      if (i < xs.length) {
        start = xs[i]
        prev = xs[i]
      }
    }
  }
  return d
}

const svg = (w, h, body, extra = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${extra}>${body}</svg>\n`

/* ------------------------------------------------------------- wordmark ---
   20 rows of letter (row 1..20); row 0 is the ascender overshoot and row 21
   the descender. Cropped to the letter box, tracking 2 cells. */
const CELL = 10
const GAP = 0
const mark = compose('HUGINN', 2)
const WM_W = mark.cols * (CELL + GAP) - GAP
const WM_H = 20 * (CELL + GAP) - GAP
const wmPath = runsToPath(mark.cells, CELL, GAP, 0, 0, 1)
writeFileSync(resolve(OUT, 'wordmark.svg'), svg(WM_W, WM_H, `<path fill="currentColor" d="${wmPath}"/>`, 'fill="currentColor" role="img" aria-label="Huginn"'))

/* ------------------------------------------------------------------ mark ---
   The H is cut from the same module as the wordmark. One cell has left the
   grid and sits to the upper right: the raven out at dawn. */
const H5 = [
  [0, 0], [4, 0],
  [0, 1], [4, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2],
  [0, 3], [4, 3],
  [0, 4], [4, 4],
]
const H3 = [
  [0, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [2, 2],
]
const grid = (cells, cols, rows, cell, gap, fill) => {
  const w = cols * (cell + gap) - gap
  const h = rows * (cell + gap) - gap
  const d = runsToPath(cells, cell, gap)
  return { w, h, body: `<path fill="${fill}" d="${d}"/>` }
}

/* The cell that left sits off the grid, with half a cell of air so it reads as
   detached at 24px and above. Below that the compact mark takes over. */
const CELL_MARK = 10
const STRAY = { x: 5 * CELL_MARK + 0.5 * CELL_MARK, y: 0, s: CELL_MARK }
const markW = STRAY.x + STRAY.s
const markH = 5 * CELL_MARK
const hPath = runsToPath(H5, CELL_MARK, 0)
const strayRect = `<rect x="${STRAY.x}" y="${STRAY.y}" width="${STRAY.s}" height="${STRAY.s}"/>`
const markBody = `<path fill="currentColor" d="${hPath}"/>` + `<g fill="currentColor">${strayRect}</g>`
const primary = { w: markW, h: markH, body: markBody }
writeFileSync(resolve(OUT, 'mark.svg'), svg(primary.w, primary.h, primary.body, 'fill="currentColor" role="img" aria-label="Huginn mark"'))

const compact = grid(H3, 3, 3, 10, 0, 'currentColor')
writeFileSync(resolve(OUT, 'mark-compact.svg'), svg(compact.w, compact.h, compact.body, 'fill="currentColor" role="img" aria-label="Huginn compact mark"'))

/* ---------------------------------------------------------------- lockup ---
   Mark, one cell of air, then the wordmark. The wordmark's cap height equals
   the mark's height so the two sit on one baseline. */
const LOCK_GAP = 26
const lockH = primary.h
const lockW = primary.w + LOCK_GAP + WM_W * (lockH / WM_H)
const lockWm = runsToPath(mark.cells, lockH / 20, 0, primary.w + LOCK_GAP, 0, 1)
writeFileSync(
  resolve(OUT, 'lockup.svg'),
  svg(
    Math.ceil(lockW),
    lockH,
    `<path fill="currentColor" d="${primary.body.match(/d="([^"]+)"/)[1]}"/>` +
      `<path fill="currentColor" d="${lockWm}"/>`,
    'fill="currentColor" role="img" aria-label="Huginn"',
  ),
)

/* --------------------------------------------------------------- favicon ---
   A vermilion field, a bone H. No tile, no rounding: a printed stamp. */
const fav = (size, pad) => {
  const inner = size - pad * 2
  const cell = inner / 3
  const gap = 0
  const w = 3 * (cell + gap) - gap
  const h = 3 * (cell + gap) - gap
  const ox = (size - w) / 2
  const oy = (size - h) / 2
  const d = runsToPath(H3, cell, gap, ox, oy)
  return svg(
    size,
    size,
    `<rect width="${size}" height="${size}" fill="#E2281B"/><path fill="#F4EFE5" d="${d}"/>`,
  )
}
writeFileSync(resolve(OUT, 'favicons/favicon.svg'), fav(32, 4))
writeFileSync(resolve(OUT, 'favicons/favicon-16.svg'), fav(16, 2))
writeFileSync(resolve(OUT, 'favicons/favicon-32.svg'), fav(32, 4))
writeFileSync(resolve(OUT, 'favicons/favicon-180.svg'), fav(180, 24))

/* --------------------------------------------------------------- report ---
   Printed so the run is self-checking: cell counts and the box, not vibes. */
const lit = (cells) => cells.length
console.log(JSON.stringify({
  wordmark: { cols: mark.cols, cells: lit(mark.cells), box: [WM_W, WM_H], pathBytes: wmPath.length },
  mark: { cells: lit(H5), box: [primary.w, primary.h] },
  compact: { cells: lit(H3), box: [compact.w, compact.h] },
  lockup: [Math.ceil(lockW), lockH],
}, null, 2))
