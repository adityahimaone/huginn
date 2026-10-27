// Measures contrast of *rendered* elements, not token pairs.
// Walks up the tree compositing every background it meets, so a 0.45-alpha
// white on a 0.28-alpha black panel over an ink band is measured as painted.
// Usage: node scripts/audit-contrast.mjs [--theme light|dark]
import { chromium } from 'playwright-core'
import { CHROMIUM } from './chrome.mjs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const themeArg = (args[args.indexOf('--theme') + 1] || 'light').toLowerCase()

const CHROME = CHROMIUM

// Elements whose *type* carries meaning, sampled across the specimen.
// Selectors are taken from the real markup — `span` alone would match the
// decorative .dot square and report its inherited colour as a failure.
const TARGETS = [
  ['.hero h1', 'hero headline'],
  ['.hero .lede', 'hero lede'],
  ['.meta-row span:not(.dot)', 'hero meta label'],
  ['.stats b', 'stat figure'],
  ['.stats span', 'stat label'],
  ['.contents a', 'contents nav'],
  ['.head-meta .num', 'section number'],
  ['.head-meta span:last-child', 'section eyebrow'],
  ['.head-intro', 'section lede'],
  ['.rule-card p', 'rule card body'],
  ['.material-card p', 'material card body'],
  ['.note', 'note body'],
  ['.sheet-foot > span:first-child', 'figure caption'],
  ['.swatch .body b', 'swatch name'],
  ['.swatch .body code', 'swatch hex'],
  ['.swatch .body span', 'swatch role'],
  ['table.data th', 'table head'],
  ['table.data td', 'table cell'],
  ['.audit-note', 'audit note'],
  ['.token-note', 'token note'],
  ['.btn', 'button label'],
  ['.btn.primary', 'primary button'],
  ['.tag', 'tag'],
  ['.field label', 'field label'],
  ['.hint', 'field hint'],
  ['.error', 'error text'],
  ['.whf-legal', 'footer legal'],
  ['.whf-col a', 'footer link'],
  ['.whf-col h3', 'footer column head'],
  ['.whf-sig span', 'footer sigil'],
  ['.whf-vert span', 'footer vertical'],
  ['.tokens-band h2', 'band headline'],
  ['.tokens-band .head-meta .num', 'band number'],
  ['.tokens-band .head-meta span:last-child', 'band eyebrow'],
  ['.tokens-band .head-intro', 'band lede'],
  ['.token-layers code', 'band layer chip'],
  ['.token-actions .btn', 'band button'],
]

const SELECTORS_PRE = ['#tokenCss .c', '#tokenCss code', '#tokenCss']

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto(pathToFileURL(resolve('design-system.html')).href, { waitUntil: 'load' })
await p.evaluate((t) => {
  document.documentElement.setAttribute('data-theme', t)
  try { localStorage.setItem('huginn-theme', t) } catch {}
}, themeArg)
await p.waitForTimeout(700)

const rows = await p.evaluate((targets) => {
  const parse = (s) => {
    const m = /^rgba?\(([^)]+)\)/.exec(s)
    if (!m) return null
    const n = m[1].split(/[,\s/]+/).filter(Boolean).map(Number)
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 }
  }
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  })
  const lum = ({ r, g, b }) => {
    const f = (v) => {
      const s = v / 255
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
    return (hi + 0.05) / (lo + 0.05)
  }
  // Composite every background between the element and the page.
  const ground = (el) => {
    const stack = []
    for (let n = el; n; n = n.parentElement) {
      const bg = parse(getComputedStyle(n).backgroundColor)
      if (bg && bg.a > 0) {
        stack.push(bg)
        if (bg.a >= 1) break
      }
    }
    let base = { r: 255, g: 255, b: 255, a: 1 }
    for (let i = stack.length - 1; i >= 0; i--) base = over(stack[i], base)
    return base
  }
  const out = []
  for (const [sel, label] of targets) {
    const el = document.querySelector(sel)
    if (!el) { out.push({ label, sel, missing: true }); continue }
    // A decorative swatch or dot inherits a colour it never paints. Skip it.
    if (!el.textContent.trim()) { out.push({ label, sel, empty: true }); continue }
    const cs = getComputedStyle(el)
    const fg = parse(cs.color)
    if (!fg) { out.push({ label, sel, missing: true }); continue }
    // A group opacity (e.g. .tokens-band .head-meta { opacity: .62 }) fades the
    // text as surely as an alpha in its colour. Fold ancestors into fg.a.
    let groupOpacity = 1
    for (let n = el; n && n !== document.documentElement; n = n.parentElement) {
      groupOpacity *= Number(getComputedStyle(n).opacity ?? 1)
    }
    const bg = ground(el)
    const painted = over({ ...fg, a: fg.a * groupOpacity }, bg)
    const r = ratio(painted, bg)
    const size = parseFloat(cs.fontSize)
    const bold = Number(cs.fontWeight) >= 700
    const large = size >= 24 || (size >= 18.66 && bold)
    out.push({
      label,
      sel,
      ratio: Number(r.toFixed(2)),
      px: Number(size.toFixed(1)),
      need: large ? 3 : 4.5,
      pass: r >= (large ? 3 : 4.5),
      fg: `rgb(${Math.round(painted.r)} ${Math.round(painted.g)} ${Math.round(painted.b)})`,
      bg: `rgb(${Math.round(bg.r)} ${Math.round(bg.g)} ${Math.round(bg.b)})`,
    })
  }
  return out
}, [...TARGETS, ...SELECTORS_PRE.map((s) => [s, 'code ' + s.replace('#tokenCss', 'block')])])

let fails = 0
let skipped = 0
console.log(`\ntheme: ${themeArg}\n`)
console.log('ELEMENT'.padEnd(26), 'PX'.padStart(5), 'RATIO'.padStart(7), 'NEED'.padStart(5), '  VERDICT')
console.log('-'.repeat(68))
for (const r of rows) {
  if (r.missing) { console.log(r.label.padEnd(26), '  (selector not in page)'); continue }
  if (r.empty) { skipped++; console.log(r.label.padEnd(26), '  (no text — decorative)'); continue }
  if (!r.pass) fails++
  console.log(
    r.label.padEnd(26),
    String(r.px).padStart(5),
    String(r.ratio).padStart(7),
    String(r.need).padStart(5),
    r.pass ? '  pass' : '  FAIL',
  )
  if (!r.pass) console.log(' '.repeat(8), `${r.fg} on ${r.bg}  (${r.sel})`)
}
console.log(`\n${fails} failing pair${fails === 1 ? '' : 's'}${skipped ? `, ${skipped} skipped` : ''}`)
await ctx.close()
await browser.close()
process.exit(fails ? 1 : 0)
