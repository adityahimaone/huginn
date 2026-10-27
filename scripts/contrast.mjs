#!/usr/bin/env node
/**
 * Measure the pairs the system actually renders. No claiming, just numbers.
 *   node scripts/contrast.mjs
 */
const hex = (h) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim())
  if (!m) throw new Error(`bad hex: ${h}`)
  const s = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255)
}
const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
const lum = (h) => {
  const [r, g, b] = hex(h).map(lin)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m)
  return (x + 0.05) / (y + 0.05)
}

const LIGHT = {
  surface: '#EBE5D8',
  raised: '#F4EFE5',
  sunken: '#DFD6C3',
  ink: '#100F0E',
  muted: '#5A5346',
  accent: '#B81C12',
  field: '#E2281B',
  accentInk: '#F4EFE5',
  focus: '#1B2DB0',
  danger: '#A31810',
  ok: '#2C5B45',
}
const DARK = {
  surface: '#100F0E',
  raised: '#1B1815',
  sunken: '#080706',
  ink: '#F4EFE5',
  muted: '#A79E8C',
  accent: '#FF5B4A',
  field: '#E2281B',
  accentInk: '#100F0E',
  focus: '#93A4FF',
  danger: '#FF7A66',
  ok: '#7FC49A',
}

const pairs = [
  ['body: ink on surface', 'ink', 'surface', 4.5],
  ['secondary: muted on surface', 'muted', 'surface', 4.5],
  ['raised body: ink on raised', 'ink', 'raised', 4.5],
  ['secondary: muted on raised', 'muted', 'raised', 4.5],
  ['action: accent-ink on accent', 'accentInk', 'accent', 4.5],
  ['action: accent on surface (link)', 'accent', 'surface', 4.5],
  ['poster: accent-ink on field', 'accentInk', 'field', 4.5],
  ['poster large: accent-ink on field', 'accentInk', 'field', 3],
  ['focus ring on surface', 'focus', 'surface', 3],
  ['focus ring on raised', 'focus', 'raised', 3],
  ['danger on surface', 'danger', 'surface', 4.5],
  ['ok on surface', 'ok', 'surface', 4.5],
]

for (const [name, set] of [['LIGHT', LIGHT], ['DARK', DARK]]) {
  console.log(`\n${name}`)
  for (const [label, fg, bg, min] of pairs) {
    const r = ratio(set[fg], set[bg])
    console.log(
      `${r >= min ? 'PASS' : 'FAIL'}  ${r.toFixed(2).padStart(5)}:1  min ${min}  ${label}  (${set[fg]} on ${set[bg]})`,
    )
  }
}
