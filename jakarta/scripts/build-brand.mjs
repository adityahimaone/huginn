// brand assets, generated. Never hand-edit brand/*.svg — edit geometry.mjs or
// tokens.json and re-run `node jakarta/scripts/build.mjs`.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PRIMARY, COMPACT, GLYPH, svg, markBody } from './geometry.mjs'
import tokens from '../src/tokens.json' with { type: 'json' }
import wordmarkMetrics from '../brand/wordmark.metrics.json' with { type: 'json' }

const OUT = fileURLToPath(new URL('../brand/', import.meta.url))
const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const INK = tokens.color.tinta
const WHITE = tokens.color.kapur
const ACCENT = tokens.color['senja-100']

mkdirSync(OUT, { recursive: true })
const write = (name, content) => writeFileSync(OUT + name, content)

// ── the three drawings ──────────────────────────────────────────────────────
write('mark.svg', svg({ viewBox: PRIMARY.viewBox, body: markBody(PRIMARY) }))
write('mark-compact.svg', svg({ viewBox: COMPACT.viewBox, body: markBody(COMPACT) }))

const glyphBody = (plate) =>
  `<rect width="32" height="32" fill="${plate}"/><path d="${GLYPH.d}" fill="${WHITE}"/>`
write('glyph.svg', svg({ viewBox: GLYPH.viewBox, body: glyphBody(ACCENT), fill: 'none' }))

// ── baked inks. An <img> resolves currentColor to black; bake it. ───────────
write('mark-ink.svg', svg({ viewBox: PRIMARY.viewBox, body: markBody(PRIMARY), fill: INK }))
write('mark-reverse.svg', svg({ viewBox: PRIMARY.viewBox, body: markBody(PRIMARY), fill: WHITE }))
write('mark-compact-ink.svg', svg({ viewBox: COMPACT.viewBox, body: markBody(COMPACT), fill: INK }))
write('mark-compact-reverse.svg', svg({ viewBox: COMPACT.viewBox, body: markBody(COMPACT), fill: WHITE }))

// ── wordmark: outlined once by scripts/outline-wordmark.py, baked here ──────
const outline = readFileSync(SRC + 'wordmark.outline.svg', 'utf8')
const wordmarkPath = stripSvg(outline)
write('wordmark.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${wordmarkMetrics.ink.w}" height="${wordmarkMetrics.ink.h}" viewBox="0 0 ${wordmarkMetrics.ink.w} ${wordmarkMetrics.ink.h}" fill="${INK}" role="img" aria-label="JAKARTA">${wordmarkPath}</svg>\n`)
write('wordmark-reverse.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="${wordmarkMetrics.ink.w}" height="${wordmarkMetrics.ink.h}" viewBox="0 0 ${wordmarkMetrics.ink.w} ${wordmarkMetrics.ink.h}" fill="${WHITE}" role="img" aria-label="JAKARTA">${wordmarkPath}</svg>\n`)

// ── lockups: mark + wordmark, cap height locked to the mark ────────────────
// Cap height = 0.72 x the mark's ink height; gap = 1.6S. Both ratios, so the
// lockup scales without a second measurement.
const lockup = (fill) => {
  const [vx, vy, vw, vh] = PRIMARY.viewBox
  const mH = PRIMARY.ink.h
  const capTarget = mH * 0.72
  const k = capTarget / wordmarkMetrics.capHeight
  const gap = 1.6 * 100
  const wmW = wordmarkMetrics.ink.w * k
  const totalW = vw + gap + wmW
  const y = vy + PRIMARY.pad + (mH - capTarget) / 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW.toFixed(1)}" height="${vh}" viewBox="0 0 ${totalW.toFixed(1)} ${vh}" role="img" aria-label="Jakarta">
<g fill="${fill}">${markBody(PRIMARY)}</g>
<g transform="translate(${(vw + gap).toFixed(1)} ${y.toFixed(1)}) scale(${k.toFixed(5)})" fill="${fill}">${wordmarkPath}</g>
</svg>\n`
}
write('lockup.svg', lockup(INK))
write('lockup-reverse.svg', lockup(WHITE))

// ── favicons ────────────────────────────────────────────────────────────────
write('favicon.svg', svg({ viewBox: GLYPH.viewBox, body: glyphBody(ACCENT), fill: 'none' }))
for (const size of [16, 32, 180]) {
  write(`favicon-${size}.svg`, svg({ viewBox: GLYPH.viewBox, body: glyphBody(ACCENT), fill: 'none' }))
}

// ── the clear-space diagram, as data the page can draw ─────────────────────
write('mark.spec.json', JSON.stringify({
  unit: 100,
  viewBox: PRIMARY.viewBox,
  ink: PRIMARY.ink,
  dot: PRIMARY.dot,
  gap: +(PRIMARY.dot.cx - PRIMARY.dot.r - (PRIMARY.ink.x + 250)).toFixed(1),
  ratios: { stroke: 1, dot: 1.38, gap: 0.62, outer: 2, inner: 1 },
  minDigital: tokens.mark.minDigital,
  minPrint: tokens.mark.minPrint,
}, null, 1))

console.log('brand: 13 files written')

function stripSvg(s) {
  return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
}
