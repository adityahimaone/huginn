// Generates the shippable footer assets FROM the specimen, so the page and
// components/ui/huginn-footer.tsx cannot drift apart. Run after editing the
// footer in design-system.html:  node scripts/build-component.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const SRC = resolve('design-system.html')
const html = readFileSync(SRC, 'utf8')
const lines = html.split('\n')

const findLine = (needle, from = 0) => {
  const i = lines.findIndex((l, idx) => idx >= from && l.includes(needle))
  if (i < 0) throw new Error(`marker not found: ${needle}`)
  return i
}

/* ----------------------------------- CSS ---------------------------------- */
const cssStart = findLine('.whf {', findLine('container-type: inline-size') - 12)
const cssEnd = findLine('Responsive', cssStart) - 2 // keep the block's closing brace
const css = lines
  .slice(cssStart, cssEnd)
  .map((l) => l.replace(/^ {6}/, ''))
  .join('\n')
  .trimEnd()

if (!css.startsWith('.whf {')) throw new Error('CSS slice does not start at .whf')
if (!css.includes('@container')) throw new Error('CSS slice is missing the container queries')

const cssOut = `/* Huginn footer — generated from design-system.html by
   scripts/build-component.mjs. Do not edit by hand; edit the specimen and
   re-run the generator, or the page and the component will drift.

   Every colour here resolves through a token, with the field vermilion as the
   last-resort fallback so the footer still paints if tokens are missing. */

${css}

/* Motion is the one thing the specimen animates. Under a reduced-motion
   preference every sequence must land on a finished still, never a blank. */
@media (prefers-reduced-motion: reduce) {
  .whf-picture .whf-cutout { clip-path: inset(0 0 0 0); }
  .whf-wipe { clip-path: inset(0 0 0 0); }
  .whf-marks .whf-fade { opacity: 1; }
  .whf-swash path { stroke-dashoffset: 0; }
  .whf * { transition-duration: 0.01ms !important; animation-duration: 0.01ms !important; }
}
`

/* ------------------------------------ JS ---------------------------------- */
const jsStart = findLine('const ROWS = 22')
const jsEnd = findLine('Page wiring', jsStart) - 2 // keep the class's closing brace
const js = lines
  .slice(jsStart, jsEnd)
  .map((l) => l.replace(/^ {6}/, ''))
  .join('\n')
  .trimEnd()

if (!js.includes('class WildHunt')) throw new Error('JS slice is missing the controller')

const jsOut = `// Huginn footer controller — generated from design-system.html by
// scripts/build-component.mjs. Do not edit by hand.
//
// The wordmark is a drawing, not a typeface: glyphs are packed cell strings
// decoded to coordinates, then painted. The painting is a *mask* — the canvas
// is punched with transparent holes, so no pixel of the artwork is ever read
// and the canvas can never taint.
/* eslint-disable */

${js}

export {
  ROWS,
  SPAN,
  GLYPHS,
  BAYER,
  decode,
  pack,
  compose,
  blocksOf,
  dissolveAt,
  hashAt,
  coordAt,
  swashPath,
  toRgb,
  readColor,
  reduced,
  PRESETS,
  WildHunt,
}
`

for (const [path, body] of [
  ['components/ui/huginn-footer.css', cssOut],
  ['lib/wild-hunt.js', jsOut],
]) {
  mkdirSync(dirname(resolve(path)), { recursive: true })
  writeFileSync(resolve(path), body, 'utf8')
  const n = body.split('\n').length
  console.log(`${path.padEnd(38)} ${String(n).padStart(4)} lines`)
}

console.log(`\ncss  ${cssStart + 1}–${cssEnd}   js  ${jsStart + 1}–${jsEnd}`)
