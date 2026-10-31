// Page build. Inlines tokens, fonts, styles, script and generated data blocks
// into one file: jakarta/index.html. Nothing in that file is hand-edited.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PRIMARY, COMPACT, GLYPH, markBody } from './geometry.mjs'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const read = (p) => readFileSync(ROOT + p, 'utf8')
const t = JSON.parse(read('src/tokens.json'))
const contrast = JSON.parse(read('docs/contrast.json'))
const NS = t.namespace
const n = (v) => String(v).replace('.', ',')

// ── sprite ─────────────────────────────────────────────────────────────────
const duotone = (() => {
  const a = [0x20, 0x26, 0x2c].map((v) => (v / 255).toFixed(3))
  const b = [0xff, 0x92, 0x75].map((v) => (v / 255).toFixed(3))
  return `<filter id="jkt-duotone" color-interpolation-filters="sRGB">
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer>
        <feFuncR type="table" tableValues="${a[0]} ${b[0]}"/>
        <feFuncG type="table" tableValues="${a[1]} ${b[1]}"/>
        <feFuncB type="table" tableValues="${a[2]} ${b[2]}"/>
      </feComponentTransfer>
    </filter>`
})()

const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>${duotone}</defs>
  <symbol id="jk-mark" viewBox="${PRIMARY.viewBox.join(' ')}">${markBody(PRIMARY)}</symbol>
  <symbol id="jk-compact" viewBox="${COMPACT.viewBox.join(' ')}">${markBody(COMPACT)}</symbol>
  <symbol id="jk-glyph" viewBox="0 0 32 32"><rect width="32" height="32" fill="#F7481B"/><path d="${GLYPH.d}" fill="#fff"/></symbol>
</svg>`

// ── colour maths (same functions as build-tokens, kept local so the page build
//    has no import cycle) ───────────────────────────────────────────────────
const hex2rgb = (h) => { const x = parseInt(h.slice(1), 16); return [(x >> 16) & 255, (x >> 8) & 255, x & 255] }
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }
const lum = (h) => { const [r, g, b] = hex2rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) }
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// ── ramps ──────────────────────────────────────────────────────────────────
const rampRow = (r) => {
  const steps = [100, 200, 300, 400].map((w) => {
    const hex = t.color[`${r.key}-${w}`]
    const ink = ratio(hex, '#ffffff') >= ratio(hex, '#14181c') ? 'light' : 'dark'
    return `<button class="step" data-hex="${hex}" data-var="--${NS}-${r.key}-${w}" data-ink="${ink}" style="background:${hex}">
        <span class="step__w">${w}</span><span class="step__hex">${hex}</span>
      </button>`
  }).join('')
  const onPaper = ratio(t.color[`${r.key}-100`], t.color.kertas)
  const cls = onPaper >= 4.5 ? 'pass' : onPaper >= 3 ? 'large' : 'fail'
  const label = onPaper >= 4.5 ? 'body text' : onPaper >= 3 ? 'large only' : 'surface only'
  return `<div class="ramp" data-ramp="${r.key}">
      <div class="ramp__id">
        <span class="ramp__name">${r.name}</span>
        <span class="ramp__gloss">${r.gloss}</span>
      </div>
      <div class="ramp__steps">${steps}</div>
      <div class="ramp__job">
        <span>${r.job}</span>
        <span class="ramp__ratio">${n(onPaper.toFixed(2))}:1 on paper</span>
        <span class="pill pill--${cls}">${label}</span>
      </div>
    </div>`
}

const inkTest = t.ramps.map((r) => {
  const hex = t.color[`${r.key}-100`]
  const onPaper = ratio(hex, t.color.kertas)
  const v = onPaper >= 4.5 ? 'Passes 4,5:1' : onPaper >= 3 ? 'Large text only' : 'Invisible — surface only'
  return `<div>
      <p class="sample" style="color:${hex}">Warga Jakarta, selamat pagi.</p>
      <p class="big" style="color:${hex}">24px+</p>
      <p class="verdict">${r.name.split(' ')[0]} · <b>${n(onPaper.toFixed(2))}:1</b> — ${v}</p>
    </div>`
}).join('')

// ── type specimen ──────────────────────────────────────────────────────────
const SAMPLES = {
  'display-1': 'Kota Kolaborasi',
  'display-2': 'Kota Kolaborasi',
  h1: 'Jakarta, kota kolaborasi',
  h2: 'Sembilan distrik, satu kisi',
  h3: 'Warna adalah peta, bukan suasana',
  h4: 'TransJakarta koridor 1',
  'body-l': 'Sepuluh juta orang bernegosiasi setiap pagi.',
  body: 'Jakarta bekerja karena sepuluh juta orang menegosiasikannya setiap pagi.',
  'body-s': 'Kartu ini milik Pemerintah Provinsi DKI Jakarta.',
  caption: 'Koridor 1 · Blok M — Kota',
  button: 'Lapor warga',
}
const typeSpec = t.type.map((s) => `<div class="spec__row">
      <div class="spec__id">${s.key}</div>
      <div class="spec__sample" style="--s:${s.size}px;font-weight:${s.weight};letter-spacing:${s.track}em;line-height:${s.lh};text-transform:${s.transform === 'none' ? 'none' : s.transform}">${SAMPLES[s.key]}</div>
      <div class="spec__meta">${s.size}px / ${s.lh}<br>${s.track}em · ${s.weight}<br><span style="opacity:.7">${s.use}</span></div>
    </div>`).join('')

// ── spacing ────────────────────────────────────────────────────────────────
const maxSpace = Math.max(...Object.values(t.space))
const spaceScale = Object.entries(t.space).map(([k, v]) => `<div class="scale__row">
      <span class="faint">${k}</span>
      <div class="scale__bar" style="width:${Math.max(2, (v / maxSpace) * 100)}%"></div>
      <span class="faint" style="text-align:right">${v}px · --${NS}-space-${k}</span>
    </div>`).join('')

// ── token table ────────────────────────────────────────────────────────────
const rows = []
for (const [k, v] of Object.entries(t.color)) rows.push({ name: `--${NS}-${k}`, val: v, sw: v })
for (const [k, v] of Object.entries(t.semantic.light)) rows.push({ name: `--${NS}-${k}`, val: `→ ${v}`, sw: t.color[v] })
for (const [k, v] of Object.entries(t.space)) rows.push({ name: `--${NS}-space-${k}`, val: `${v}px`, sw: null })
for (const [k, v] of Object.entries(t.radius)) rows.push({ name: `--${NS}-radius-${k}`, val: `${v}px`, sw: null })
for (const [k, v] of Object.entries(t.motion)) rows.push({ name: `--${NS}-${k === 'ease' ? 'ease' : 'dur-' + k}`, val: `${v}`, sw: null })
const tokenTable = rows.map((r) => `<div class="tokrow" data-tok="${r.name}">
      <span class="name">${r.name}</span>
      <span class="val">${r.val}</span>
      <span class="sw" style="${r.sw ? `background:${r.sw}` : 'background:transparent'}"></span>
    </div>`).join('')

// ── audit ──────────────────────────────────────────────────────────────────
const light = contrast.scopes.light
const night = contrast.scopes.night
const passL = light.filter((p) => p.pass).length
const passN = night.filter((p) => p.pass).length
const failL = light.filter((p) => !p.pass)
const R = (cls, txt) => `<span class="res res--${cls}">${txt}</span>`

const AUDIT = [
  ['Mark redrawn, not traced', R('pass', 'Pass'),
    `The supplied 6000 × 5008 bitmap and the SVG are rasterised at 600 × 501 and compared: <b>0,989 IoU</b>, 768 px of surplus in the original and 473 in the redraw, all antialiasing. <span class="mono">scripts/verify-mark.mjs</span>`],
  ['Mark at 32px', R('pass', 'Pass'),
    'The hook, the 2:1 corner and the stop all resolve on paper, on ink and on Senja. Checked at 96, 48, 32 and 24px on the real grounds.'],
  ['Compact at 16px', R('part', 'Partial'),
    'The compact is a separate drawing — 0,78S stop, 0,44S gap, no clear space — and it holds at 16 and 24: <b>0,918 IoU</b> against the primary\'s 0,989, and the difference <i>is</i> the redesign. It keeps two shapes, so the gate\'s “fewer shapes than the primary” rule is <b>not met</b>. The one-shape drawing in this family is the glyph, and the glyph is what actually ships at 16px.'],
  ['Wordmark', R('pass', 'Pass'),
    'Outlined from the variable TTF at wght 800 with −0,045em tracking. No <code class="mono">&lt;text&gt;</code> element in any file in <span class="mono">brand/</span>.'],
  ['Contrast — light', R('part', 'Partial'),
    `${light.length} semantic pairs computed: <b>${passL} pass, ${light.length - passL} fail</b>. The failures are the district colours used as text — Senja ${n(ratio(t.color['senja-100'], t.color.kertas).toFixed(2))}:1, Laut ${n(ratio(t.color['laut-100'], t.color.kertas).toFixed(2))}:1, Daun ${n(ratio(t.color['daun-100'], t.color.kertas).toFixed(2))}:1, Menteng ${n(ratio(t.color['menteng-100'], t.color.kertas).toFixed(2))}:1, Ancol ${n(ratio(t.color['ancol-100'], t.color.kertas).toFixed(2))}:1, Doger ${n(ratio(t.color['doger-100'], t.color.kertas).toFixed(2))}:1, Kebayoran ${n(ratio(t.color['kebayoran-100'], t.color.kertas).toFixed(2))}:1. Published, with the job each one is therefore not allowed to do.`],
  ['Contrast — night', R('pass', 'Pass'),
    `${night.length} pairs, <b>${passN} pass</b>. The one failure is Langit-300 used as a label on Malam-100 at ${n(ratio(t.color['langit-300'], t.color['malam-100']).toFixed(2))}:1 — large text only.`],
  ['Font registered', R('pass', 'Pass'),
    'Plus Jakarta Sans, variable, wght 200–800, latin subset, 27 kB, embedded as base64 and applied to <code class="mono">body</code>. The page renders identically with the network off.'],
  ['Reduced motion', R('pass', 'Pass'),
    'Durations collapse to 0ms, the reveal is applied immediately, image hover transforms are removed. The still frame is the finished composition, not a frozen one.'],
  ['390 and 1440', R('pass', 'Pass'),
    'Single column at 390, no horizontal scroll — <span class="mono">scrollWidth − clientWidth = 0</span>, measured at both widths. Rail hidden below 1320. Tables reflow to stacked rows.'],
  ['Night scope', R('pass', 'Pass'),
    '<code class="mono">html[data-jk="night"]</code> swaps the semantic layer only. All 46 primitives are identical in both scopes; nothing is mode-prefixed.'],
  ['Figma export', R('pass', 'Pass'),
    '<span class="mono">figma-smoke.mjs</span> exits 0: <b>6 pages, 87 variables, 11 text styles, 10 components</b>. 87 = 46 primitives + 21 semantic + 12 space + 5 radius + 3 motion, exactly.'],
  ['Photography brief vs assets', R('part', 'Partial'),
    'The brief assigns one supplied file to “Kota Tua heritage”. The file is a daytime skyline over kampung rooftops. Captioned by content; the heritage slot is unfilled.'],
  ['Print proof', R('open', 'Open'), 'No pull on enamel or vinyl. No CMYK conversion tested. Senja at 3,24:1 is a screen measurement.'],
  ['Audience testing', R('open', 'Open'), 'No resident, driver or district officer has seen this. Every claim about clarity is a hypothesis.'],
]
const auditRows = AUDIT.map(([c, r, e]) => `<tr><td class="chk">${c}</td><td>${r}</td><td class="ev">${e}</td></tr>`).join('')

// ── inline the rest ────────────────────────────────────────────────────────
const fontB64 = readFileSync(ROOT + 'assets/fonts/PlusJakartaSans-var.woff2').toString('base64')
const fonts = `@font-face{font-family:'Plus Jakarta Sans';src:url(data:font/woff2;base64,${fontB64}) format('woff2-variations');font-weight:200 800;font-display:swap;font-style:normal}`

let html = read('src/page.html')
const put = (marker, content) => {
  const m = new RegExp(`<!--@${marker}-->`)
  if (!m.test(html)) throw new Error(`missing marker @${marker}`)
  html = html.replace(m, () => content)
}
put('sprite', sprite)
put('ramps', rampRow.length ? t.ramps.map(rampRow).join('\n') : '')
put('inktest', inkTest)
put('typespec', typeSpec)
put('spacescale', spaceScale)
put('tokens-table', tokenTable)
put('audit-rows', auditRows)

html = html
  .replace('/*@fonts*/', () => fonts)
  .replace('/*@tokens*/', () => read(`tokens/${t.slug}.tokens.css`))
  .replace('/*@style*/', () => read('src/style.css'))
  .replace('/*@app*/', () => read('src/app.js'))

writeFileSync(ROOT + 'index.html', html)
console.log(`index.html · ${(html.length / 1024).toFixed(0)} kB · ${rows.length} token rows · ${AUDIT.length} audit rows`)
