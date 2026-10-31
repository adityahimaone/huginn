#!/usr/bin/env node
/**
 * figma-forge — a design system, exported to Figma by script.
 *
 *   node scripts/figma-forge.mjs \
 *     --tokens features/huginn/tokens.json \
 *     --css    public/brand/huginn/huginn-tokens.css \
 *     --brand  public/brand/huginn \
 *     --html   design-system.html \
 *     --slug   huginn --name "Huginn" --essence "One red field, one quiet serif." \
 *     --out    design/figma/huginn --target both
 *
 * Two emitters, one source of truth:
 *
 *   figma       manifest.json + code.js — a plugin that builds variables
 *               (light/dark), paint/text/effect/grid styles, components with
 *               variants, and one page per section. Full API.
 *   openpencil  openpencil.build.js + a real .fig on disk via the OpenPencil
 *               CLI, for people who do not have Figma open. Geometry only.
 *
 * Why a generator and not a hand-written plugin: the token file changes every
 * time the brand moves, and a plugin that has to be re-authored each time is
 * not an export path, it is a second implementation that drifts.
 *
 * Zero dependencies. `--check` prints what it resolved and writes nothing.
 */
import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, resolve, basename, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { execFileSync } from 'node:child_process'
import { spawnSync } from 'node:child_process'
import * as glyphs from './glyphs.mjs'
import { buildBoard } from './board.mjs'

const HERE = new URL('.', import.meta.url).pathname
const TEMPLATES = resolve(HERE, '..', 'templates')

/* ── args ────────────────────────────────────────────────────────────────── */

const argv = process.argv.slice(2)
const one = (name, fallback) => {
  const i = argv.indexOf(`--${name}`)
  return i === -1 ? fallback : argv[i + 1]
}
const has = (name) => argv.includes(`--${name}`)
const many = (name) => argv.reduce((acc, a, i) => (a === `--${name}` ? [...acc, argv[i + 1]] : acc), [])

const opt = {
  tokens: one('tokens', ''),
  css: one('css', ''),
  brand: one('brand', ''),
  html: one('html', ''),
  slug: one('slug', ''),
  name: one('name', ''),
  essence: one('essence', ''),
  out: one('out', ''),
  target: one('target', 'both'),
  'fig-font': one('fig-font', ''),
  'font-dir': many('font-dir'),
  run: has('run'),
  check: has('check'),
}

const die = (m) => {
  console.error(`\n  ✗ ${m}\n`)
  process.exit(1)
}

if (!opt.tokens) {
  console.error(`Usage:
  node scripts/figma-forge.mjs --tokens <tokens.json> --slug <slug> --name "<Name>"
    [--css <tokens.css>] [--brand <asset dir>] [--html <design-system.html>]
    [--essence "..."] [--out design/figma/<slug>] [--target figma|openpencil|both]
    [--run] [--check]`)
  process.exit(1)
}

const tokensPath = resolve(opt.tokens)
if (!existsSync(tokensPath)) die(`no token file at ${tokensPath}`)

const slug = (opt.slug || basename(tokensPath).replace(/\.tokens\.json$/, '').replace(/\.json$/, '')).trim()
if (!/^[a-z][a-z0-9-]{1,23}$/.test(slug)) die(`slug "${slug}" must be kebab-case, 2–24 chars`)

const outDir = resolve(opt.out || join('design', 'figma', slug))
const brandDir = opt.brand ? resolve(opt.brand) : ''
const cssPath = opt.css ? resolve(opt.css) : ''
const htmlPath = opt.html ? resolve(opt.html) : ''

/* ── value helpers ───────────────────────────────────────────────────────── */

const V = (node) => {
  if (node == null) return null
  if (typeof node === 'string' || typeof node === 'number') return node
  if (Array.isArray(node)) return null
  if (typeof node !== 'object') return null
  if ('$value' in node) return node.$value
  if ('value' in node) return node.value
  return null
}
const NOTE = (node) =>
  (node && typeof node === 'object' && (node.$description || node.description || node.note)) || ''

/** An object whose keys are token names, not token fields. */
const isGroup = (node) =>
  node && typeof node === 'object' && !Array.isArray(node) && !('$value' in node) && !('value' in node)

/** Normalise a group, a list of {name,value}, or a list of {role,size}. */
function entries(node) {
  if (!node) return []
  if (Array.isArray(node)) {
    return node
      .map((x, i) => {
        if (x == null) return null
        if (typeof x === 'string' || typeof x === 'number') return { name: String(i + 1), value: x, note: '' }
        const name = x.name || x.role || x.id || String(i + 1)
        const value = x.value ?? x.$value ?? x.size ?? x.px ?? x.hex
        return { name: String(name), value, note: NOTE(x) || x.use || '' }
      })
      .filter(Boolean)
  }
  if (isGroup(node)) {
    return Object.entries(node)
      .filter(([, v]) => V(v) !== null || typeof v === 'number')
      .map(([k, v]) => ({ name: k, value: V(v), note: NOTE(v), raw: v }))
  }
  return []
}

/** "clamp(2.75rem, 6.4vw, 5.25rem)" → 84 · "1.0625rem" → 17 · 999 → 999 */
function toPx(value, base = 16) {
  if (typeof value === 'number') return value
  if (value == null) return null
  const s = String(value).trim()
  if (/^clamp\(/i.test(s)) {
    const parts = s.slice(s.indexOf('(') + 1, s.lastIndexOf(')')).split(',')
    return toPx(parts[parts.length - 1], base)
  }
  const m = s.match(/^(-?[\d.]+)\s*(px|rem|em|pt|%)?$/)
  if (!m) return null
  const n = Number(m[1])
  if (Number.isNaN(n)) return null
  switch (m[2]) {
    case 'rem':
    case 'em':
      return +(n * base).toFixed(2)
    case 'pt':
      return +((n * 4) / 3).toFixed(2)
    case '%':
      return n
    default:
      return n
  }
}

/** "-0.035em" → -0.035 · "-0.5px" at 16 → -0.03 (a ratio) */
function toRatio(value, size) {
  if (value == null) return 0
  const s = String(value).trim()
  const m = s.match(/^(-?[\d.]+)\s*(em|px|%)?$/)
  if (!m) return 0
  const n = Number(m[1])
  if (Number.isNaN(n)) return 0
  if (m[2] === 'px' && size) return +(n / size).toFixed(4)
  if (m[2] === '%') return +(n / 100).toFixed(4)
  return n
}

/* ── colour ──────────────────────────────────────────────────────────────── */

const NAMED = {
  white: '#ffffff',
  black: '#000000',
  transparent: '#00000000',
}

function parseColour(value, vars, depth = 0) {
  if (value == null || depth > 8) return null
  const s = String(value).trim()

  const varMatch = s.match(/^var\(\s*--([\w-]+)\s*(?:,\s*([^)]+))?\)$/)
  if (varMatch) {
    const key = varMatch[1]
    const next = vars && vars[key]
    if (next != null) return parseColour(next, vars, depth + 1)
    if (varMatch[2]) return parseColour(varMatch[2], vars, depth + 1)
    return null
  }
  if (/^(currentColor|inherit|initial|none)$/i.test(s)) return null

  if (s.startsWith('#')) {
    let h = s.slice(1)
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
    if (h.length === 4) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]
    const alpha = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1
    return { hex: '#' + h.slice(0, 6).toUpperCase(), alpha: +alpha.toFixed(3) }
  }

  const fn = s.match(/^rgba?\(([^)]+)\)$/i)
  if (fn) {
    const body = fn[1].trim()
    const parts = body.includes('/')
      ? body.split('/').flatMap((p) => p.trim().split(/\s+/))
      : body.split(/[,\s]+/).filter(Boolean)
    const [r, g, b] = parts.slice(0, 3).map((p) =>
      p.endsWith('%') ? Math.round((parseFloat(p) / 100) * 255) : Math.round(parseFloat(p))
    )
    let a = 1
    if (parts[3] != null) a = parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3])
    if ([r, g, b].some((n) => Number.isNaN(n))) return null
    const hex = '#' + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0')).join('').toUpperCase()
    return { hex, alpha: Number.isNaN(a) ? 1 : +a.toFixed(3) }
  }

  const named = NAMED[s.toLowerCase()]
  if (named) return parseColour(named, vars, depth + 1)
  return null
}

/* ── css ─────────────────────────────────────────────────────────────────── */

const GENERIC = new Set([
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
  'system-ui',
  'ui-serif',
  'ui-sans-serif',
  'ui-monospace',
  'ui-rounded',
  'inherit',
  'initial',
  'none',
])

function splitCssScopes(rawCss) {
  /* Comments first. Clearing's header comment contains
   * `html[data-clearing='night'] .cl-scope` — searching the raw text splits the
   * sheet inside the comment, the light scope comes back empty, and every
   * semantic token resolves to nothing. That is the whole bug. */
  const css = rawCss.replace(/\/\*[\s\S]*?\*\//g, '')

  const darkRe =
    /\[data-[\w-]+\s*=\s*['"]?(?:dark|night)['"]?\]|\.dark\b|\.night\b|prefers-color-scheme\s*:\s*dark/i

  const read = (block, into) => {
    const re = /--([\w-]+)\s*:\s*([^;{}]+);/g
    let m
    while ((m = re.exec(block))) into[m[1]] = m[2].trim()
    return into
  }

  /* Every dark rule, with the span of its brace block. The one that declares the
   * most custom properties is the theme; the others are one-off overrides. */
  const candidates = []
  const re = new RegExp(darkRe.source, 'gi')
  let hit
  while ((hit = re.exec(css))) {
    const braceStart = css.indexOf('{', hit.index)
    if (braceStart === -1) continue
    let depth = 0
    let end = css.length
    for (let i = braceStart; i < css.length; i++) {
      if (css[i] === '{') depth++
      else if (css[i] === '}') {
        depth--
        if (depth === 0) {
          end = i
          break
        }
      }
    }
    const block = css.slice(braceStart, end)
    const count = (block.match(/--[\w-]+\s*:/g) || []).length
    candidates.push({ start: hit.index, braceStart, end, block, count })
  }

  if (!candidates.length) return { light: read(css, {}), dark: {} }

  candidates.sort((a, b) => b.count - a.count)
  const theme = candidates[0]
  if (theme.count === 0) return { light: read(css, {}), dark: {} }

  /* The base scope is whatever is not the theme block — usually one `.scope {…}`
   * that carries both the primitives and the light semantics. */
  /* Light is everything the theme block is not. Reading the block back into the
   * light scope is how clearing's light palette came out as its night palette. */
  const light = read(css.slice(0, theme.start), {})
  read(css.slice(theme.end + 1), light)

  return { light, dark: read(theme.block, {}) }
}

/** `surfacePage` → `surface-page`, so a JSON name finds its CSS declaration. */
const kebab = (name) => String(name).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

function firstFamily(stack) {
  if (!stack) return ''
  const parts = String(stack)
    .split(',')
    .map((p) => p.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean)
  const hit = parts.find((p) => !GENERIC.has(p.toLowerCase()) && !p.startsWith('var('))
  return hit || ''
}

/* ── tokens ──────────────────────────────────────────────────────────────── */

const tokens = JSON.parse(await readFile(tokensPath, 'utf8'))
let cssScopes = { light: {}, dark: {} }
let cssText = ''
if (cssPath && existsSync(cssPath)) {
  cssText = await readFile(cssPath, 'utf8')
  cssScopes = splitCssScopes(cssText)
  /* Clearing declares `--cl-font-reading`; the JSON and every reader say
   * `font-reading`. Register both spellings once, here, so nothing downstream
   * has to know about the namespace. */
  for (const scope of ['light', 'dark']) {
    for (const [k, v] of Object.entries(cssScopes[scope])) {
      const bare = k.replace(/^[a-z]{2,4}-/, '')
      if (bare && !(bare in cssScopes[scope])) cssScopes[scope][bare] = v
    }
  }
}

const families = {
  reading: firstFamily(cssScopes.light['font-reading']) || firstFamily(cssScopes.light['font-body']) || '',
  label: firstFamily(cssScopes.light['font-label']) || firstFamily(cssScopes.light['font-mono']) || '',
  display:
    firstFamily(cssScopes.light['font-display']) ||
    firstFamily(cssScopes.light['font-sheet']) ||
    firstFamily(cssScopes.light['font-reading']) ||
    '',
}

/* optional per-brand overrides, next to the tokens file or in the brand folder */
let override = {}
for (const candidate of [
  brandDir && join(brandDir, 'figma.json'),
  join(resolve(tokensPath, '..'), 'figma.json'),
]) {
  if (candidate && existsSync(candidate)) {
    try {
      override = JSON.parse(await readFile(candidate, 'utf8'))
      break
    } catch (e) {
      die(`figma.json is not valid JSON: ${e.message}`)
    }
  }
}
if (override.families) Object.assign(families, override.families)
if (!families.reading) families.reading = override.fallbackFamily || 'Inter'
if (!families.label) families.label = families.reading
if (!families.display) families.display = families.reading

/* colours
 *
 * Three layers of variable resolution, weakest first:
 *   1 · the primitive names themselves, so `var(--cream)` resolves even when no
 *       CSS file was passed;
 *   2 · the light scope of the CSS;
 *   3 · the dark scope, when asked for it.
 * A namespaced declaration (`--cl-cream`) also registers its bare name, because
 * the JSON writes `var(--cream)` while the CSS declares `--cl-cream`. */
/* filled once the primitives are known; empty while they are being read, which
 * is correct — a primitive is a literal, it never aliases itself. */
const primitiveByName = {}

const varsFor = (scope) => {
  const bare = {}
  for (const [k, v] of Object.entries(cssScopes.light)) {
    bare[k] = v
    const stripped = k.replace(/^[a-z]{2,4}-/, '')
    if (stripped && !(stripped in bare)) bare[stripped] = v
  }
  const dark = {}
  for (const [k, v] of Object.entries(cssScopes.dark)) {
    dark[k] = v
    const stripped = k.replace(/^[a-z]{2,4}-/, '')
    if (stripped && !(stripped in dark)) dark[stripped] = v
  }
  return { ...primitiveByName, ...bare, ...(scope === 'dark' ? dark : {}) }
}

function collectPrimitives() {
  const sources = [tokens.color && tokens.color.primitive, tokens.primitives, tokens.color, tokens.palette]
  for (const source of sources) {
    const list = entries(source)
    const coloured = list
      .map((e) => {
        const c = parseColour(e.value, varsFor('light'))
        return c ? { name: e.name, hex: c.hex, alpha: c.alpha, note: e.note } : null
      })
      .filter(Boolean)
    if (coloured.length >= 2) return coloured
  }
  return []
}

function semanticSource(scope) {
  /* The first group that *exists* wins. Choosing the first group that happens to
   * parse is how a brand with `semantic` but no CSS ends up with its primitive
   * dict used as the semantic layer, and its paper swapped for its ink. */
  const candidates = [
    tokens.color && tokens.color[scope],
    tokens.semantic && tokens.semantic[scope],
    scope === 'light' ? tokens.semantic : null,
  ]
  for (const c of candidates) if (c && entries(c).length) return c
  return null
}

function collectSemantic(scope) {
  const source = semanticSource(scope)
  if (source) {
    const list = entries(source)
    const out = list
      .map((e) => {
        const raw = String(e.value == null ? '' : e.value)
        const c = parseColour(raw, varsFor(scope))
        if (!c) return null
        /* an alias is written three ways in the wild: var(--x), $ref: "color.primitive.x",
         * or {color.primitive.x}. All of them name a primitive by its last segment. */
        const explicit =
          (e.raw && (e.raw.$ref || e.raw.ref || e.raw.$extends)) ||
          (raw.match(/^\{([\w.]+)\}$/) || [])[1] ||
          ''
        const refMatch = raw.match(/^var\(\s*--([\w-]+)/)
        let ref = explicit
          ? String(explicit).split('.').pop()
          : refMatch
            ? refMatch[1].replace(/^[a-z]{2,4}-/, '')
            : ''
        /* `var(--surface-page)` names a semantic, not a primitive, so the alias
         * is lost — and with it the point of the layer. One hop through the CSS
         * (`--cl-surface-page: var(--cl-cream)`) recovers it. */
        if (!ref || !primitiveNames.has(ref)) {
          const decl = varsFor(scope)[kebab(e.name)]
          const inner = decl && String(decl).match(/^var\(\s*--([\w-]+)/)
          if (inner) {
            const candidate = inner[1].replace(/^[a-z]{2,4}-/, '')
            if (primitiveNames.has(candidate)) ref = candidate
          }
        }
        return { name: e.name, hex: c.hex, alpha: c.alpha, note: e.note, ref }
      })
      .filter(Boolean)
    return out
  }
  return []
}

const primitive = collectPrimitives()
const primitiveNames = new Set(primitive.map((p) => p.name))
if (!primitive.length) die('no colour tokens found — expected color.primitive, primitives, color or palette')
for (const p of primitive) primitiveByName[p.name] = p.hex

const semantic = { light: collectSemantic('light'), dark: collectSemantic('dark') }

/* Some brands ship one semantic group and put the night values in the CSS scope
 * only (clearing: `html[data-clearing='night'] .cl-scope`). The JSON is not the
 * only source of a dark mode, so read the scope before giving up on it. */
if (!semantic.dark.length && Object.keys(cssScopes.dark).length) {
  const darkVars = varsFor('dark')
  for (const s of semantic.light) {
    const c = parseColour(darkVars[kebab(s.name)], darkVars)
    if (c) semantic.dark.push({ name: s.name, hex: c.hex, alpha: c.alpha, note: s.note, ref: '' })
  }
}

/* semantic names must match primitive names for aliasing to work */
for (const scope of ['light', 'dark']) {
  for (const s of semantic[scope]) if (s.ref && !primitiveNames.has(s.ref)) s.ref = ''
}

/* numbers */
const space = entries(tokens.space || tokens.spacing)
  .map((e) => ({ name: String(e.name), px: toPx(e.value), note: e.note }))
  .filter((e) => e.px != null)
const radius = entries(tokens.radius)
  .map((e) => ({ name: String(e.name), px: toPx(e.value), note: e.note }))
  .filter((e) => e.px != null)
const motion = entries(tokens.motion || tokens.duration)
  .map((e) => {
    /* `ease: "cubic-bezier(…)"` sits in the same group as the durations. Coercing
     * it with `|| 0` ships a motion variable that is 0ms and a lie. */
    const raw = String(e.value)
    if (/^[\d.]+ms$/.test(raw)) return { name: String(e.name), px: parseFloat(raw), note: e.note }
    const px = toPx(raw)
    return px == null ? null : { name: String(e.name), px, note: e.note }
  })
  .filter(Boolean)

/* type roles */
/* The role *name* decides the voice, never the description: huginn describes
 * text-small as "captions in prose", and a note-first match sets 15px body copy
 * in mono. */
const MONO_HINT = /mono|label|meta|micro|code|eyebrow|overline|tag|badge/i
const DISPLAY_HINT = /display|hero|title|h1|h2|h3|headline|cover/i

function collectTypeRoles() {
  const source = tokens.type || tokens.typography || tokens.font
  if (!source) return []
  const scale = isGroup(source) && isGroup(source.scale) ? source.scale : source
  const list = entries(scale)
  const roles = []
  for (const e of list) {
    const raw = e.raw && typeof e.raw === 'object' ? e.raw : {}
    let size = toPx(e.value)
    let lh = raw.$lineHeight ?? raw.lineHeight ?? 0
    let tracking = raw.$tracking ?? raw.tracking ?? raw.letterSpacing ?? 0
    if (size == null && raw.size != null) size = toPx(raw.size)
    if (size == null) continue
    const role = String(e.name)
    const isMono = MONO_HINT.test(role)
    const family = isMono ? families.label : DISPLAY_HINT.test(role) ? families.display : families.reading
    const weight =
      (override.weights && override.weights[role]) ||
      (DISPLAY_HINT.test(role) ? 'Bold' : isMono ? 'Medium' : 'Regular')
    roles.push({
      name: role,
      size,
      lineHeight: typeof lh === 'number' && lh > 3 ? +(lh / size).toFixed(3) : Number(lh) || 1.3,
      tracking: toRatio(tracking, size),
      family,
      weight,
      note: e.note,
    })
  }
  return roles
}

const typeRoles = collectTypeRoles()

/* Named colours used by the plugin layout.
 *
 * Semantic names are brand-specific: `surface`, `surfacePage`, `bg`, `ground`.
 * Matching on one literal name is how a brand's ink becomes its paper — the
 * first primitive then stands in for a missing ground. Match on a pattern. */
const pick = (patterns, exclude) => {
  for (const re of patterns) {
    const hit = semantic.light.find((x) => re.test(x.name) && !(exclude && exclude.test(x.name)))
    if (hit) return hit.hex
  }
  return ''
}

const ground =
  pick([/^(surface-page|surface|paper|ground|bg|background|canvas)$/i]) ||
  pick([/surface|paper|ground|background/i], /raised|sunken|elevated|inverse|overlay/i) ||
  (byName('paper') || {}).hex ||
  primitive[0].hex

const inkColour =
  pick([/^(ink|text|fg|foreground)$/i]) ||
  pick([/^(ink|text|fg|foreground)/i], /muted|subtle|faint|disabled|inverse|on-|placeholder/i) ||
  (byName('ink') || {}).hex ||
  primitive[primitive.length - 1].hex

const colours = {
  paper: ground,
  raised:
    pick([/^(surface-raised|surface-elevated|surface-card|elevated|card|surface-1)$/i]) ||
    pick([/raised|elevated|card/i]) ||
    ground,
  ink: inkColour,
  inkMuted: pick([/muted|subtle|secondary|faint/i]) || inkColour,
  accent:
    pick([/^(accent|brand|primary|action)$/i]) ||
    /* `textPrimary` matches /primary/ and comes first in the list, so accent
     * resolves to the body ink unless text roles are excluded outright. */
    pick([/accent|brand/i], /ink|field|pressed|hover|on-|fg|text|surface/i) ||
    pick([/primary|action/i], /text|ink|on-|fg|surface/i) ||
    (byName('accent') || {}).hex ||
    inkColour,
  onAccent:
    /* `accentInk` and `accent-ink` are the same token in two spellings */
    pick([/^(accent-?ink|ink-?on-?field|on-?accent|accent-?fg|on-?primary)$/i]) ||
    pick([/on-|ink-?on|contrast/i]) ||
    /* the JSON often omits it; the CSS usually declares it (clearing:
     * `--cl-text-on-loud: #0e211c`) and white on a light accent is 1.6:1 */
    (() => {
      const hit = Object.keys(cssScopes.light).find((k) => /(text|ink)-on-(loud|accent|field)/i.test(k))
      const c = hit ? parseColour(cssScopes.light[hit], varsFor('light')) : null
      return c ? c.hex : ''
    })() ||
    '#FFFFFF',
  line: pick([/^(line|border|rule|divider|stroke)$/i]) || pick([/line|border|rule|divider/i]) || inkColour,
  danger: pick([/^(danger|error|critical|destructive)$/i]) || pick([/danger|error|critical/i]) || '#B3261E',
  /* a reverse cut is cream; on a cream sheet it disappears. The cell needs the
   * brand's own night ground, not a made-up one. */
  darkGround:
    (semantic.dark.find((s) => /^surface/i.test(s.name)) || {}).hex ||
    (byName('ink') || {}).hex ||
    '#111111',
}

/* sections, in reading order */
async function collectSections() {
  if (!htmlPath || !existsSync(htmlPath)) return []
  const html = await readFile(htmlPath, 'utf8')
  const ids = [...html.matchAll(/<section[^>]*\bid=["']([^"']+)["']/g)].map((m) => m[1])
  return [...new Set(ids)]
}

const sections = await collectSections()

/* assets */
const CANONICAL = [
  'mark.svg',
  'mark-compact.svg',
  'mark-reverse.svg',
  'mark-compact-reverse.svg',
  'mark-mono.svg',
  'glyph.svg',
  'wordmark.svg',
  'wordmark-reverse.svg',
  'lockup.svg',
  'lockup-reverse.svg',
  'lockup-stacked.svg',
  'lockup-stacked-reverse.svg',
  'icon.svg',
]

function sanitizeSvg(svg) {
  let out = svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/var\(\s*--[\w-]+\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g, '$1')
    .replace(/var\(\s*--[\w-]+\s*\)/g, 'currentColor')
  const open = out.match(/<svg\b[^>]*>/i)
  if (!open) return ''
  let tag = open[0]
  const vb = tag.match(/viewBox=["']([^"']+)["']/i)
  const w = tag.match(/\bwidth=["']([\d.]+)/i)
  const h = tag.match(/\bheight=["']([\d.]+)/i)
  if (!vb && w && h) tag = tag.replace(/<svg/i, `<svg viewBox="0 0 ${w[1]} ${h[1]}"`)
  tag = tag.replace(/\s(width|height)=["'][^"']*["']/gi, '')
  out = out.replace(open[0], tag)
  return out
}

/**
 * Split every <path> at its subpath boundaries.
 *
 * The importer drops the tail of a path with many contours — the clearing
 * wordmark rendered as a fragment — while a path with one or two contours is
 * exact. Splitting is lossless: same geometry, same fill, more elements.
 */
/**
 * Fold `transform="scale(1,-1)"` into the path data.
 *
 * The clearing wordmark is drawn upside-down inside a flipped group. The importer
 * mishandles that transform — the wordmark came out as a row of dashes — so the
 * flip is applied to the coordinates instead, and the viewBox is mirrored to
 * match. Only absolute commands appear in these files, which is what makes the
 * numeric rewrite safe.
 */
function flipY(pathData, dy) {
  const re = /([MLCQSTHVZmlcqsthvz])([^MLCQSTHVZmlcqsthvz]*)/g
  return pathData.replace(re, (m, cmd, rest) => {
    if (!rest.trim()) return m
    const nums = rest.trim().split(/[\s,]+/)
    const upper = cmd.toUpperCase()
    if (upper === 'H' || upper === 'Z') return m
    const out = nums.map((v, i) => {
      const num = Number(v)
      if (Number.isNaN(num)) return v
      const flip = (n) => String(Math.round((dy - n) * 100) / 100)
      if (upper === 'V') return flip(num)
      return i % 2 === 1 ? flip(num) : v
    })
    return cmd + out.join(' ')
  })
}

function foldFlip(inner, vb) {
  const transforms = [...inner.matchAll(/transform="([^"]+)"/g)].map((m) => m[1].trim())
  /* Only the pure vertical flip is folded. A group that also translates or
   * scales would need a real matrix, and guessing turned the stacked lockup into
   * a knot — better to leave those alone and accept the importer's own result. */
  if (transforms.length !== 1 || !/^scale\(\s*1\s*,\s*-1\s*\)$/.test(transforms[0])) return { inner, vb }

  const [x, y, w, h] = vb
  const dy = y + h
  const flipped = inner.replace(/<path\b([^>]*?)d="([^"]+)"([^>]*?)\/>/g, (m, pre, d, post) => {
    const fill = /fill="([^"]+)"/.exec(pre + post)
    return `<path d="${flipY(d, dy)}"${fill ? ' fill="' + fill[1] + '"' : ''}/>`
  })
  /* 2% of slack: the last descender sits exactly on the viewBox edge and a
   * frame that clips is a wordmark with its tail cut off */
  const padX = w * 0.02
  return { inner: flipped.replace(/<\/?g\b[^>]*>/g, ''), vb: [x - padX, 0, w + padX * 2, h] }
}

function splitPaths(inner) {
  return inner.replace(/<path\b([^>]*?)d="([^"]+)"([^>]*?)\/>/g, (m, pre, d, post) => {
    const parts = d.split(/(?=M)/).filter((p) => p.trim())
    if (parts.length < 2) return m
    return parts.map((p) => `<path${pre}d="${p}"${post}/>`).join('')
  })
}

/** An SVG as a placed vector: the inner markup plus its intrinsic box. */
function svgParts(svg) {
  const open = svg.match(/<svg\b[^>]*>/i)
  if (!open) return null
  const tag = open[0]
  const vb = tag.match(/viewBox=["']([^"']+)["']/i)
  let w = 24
  let h = 24
  if (vb) {
    const p = vb[1].trim().split(/[\s,]+/).map(Number)
    w = p[2] || w
    h = p[3] || h
  }
  const raw = svg.slice(open.index + tag.length, svg.lastIndexOf('</svg>'))
  const folded = foldFlip(raw, [0, 0, w, h])
  const inner = splitPaths(folded.inner)
  return { inner, w, h, vb: folded.vb }
}

async function readSvgDir(dir, filter) {
  if (!dir || !existsSync(dir)) return []
  const files = await readdir(dir)
  const out = []
  for (const file of files.filter((f) => f.endsWith('.svg') && (!filter || filter(f)))) {
    const svg = sanitizeSvg(await readFile(join(dir, file), 'utf8'))
    const parts = svg && svgParts(svg)
    if (parts) out.push({ name: file.replace(/\.svg$/, ''), file, svg, ...parts })
  }
  return out
}

let assets = []
if (brandDir && existsSync(brandDir)) {
  const files = (await readdir(brandDir)).filter((f) => f.endsWith('.svg'))
  const ordered = [
    ...CANONICAL.filter((f) => files.includes(f)),
    ...files.filter((f) => !CANONICAL.includes(f)).sort(),
  ]
  assets = await readSvgDir(brandDir, (f) => ordered.includes(f))
  assets.sort((a, b) => ordered.indexOf(a.file) - ordered.indexOf(b.file))
}

const cast = await readSvgDir(brandDir ? join(brandDir, 'cast') : '')

/* ── DATA ────────────────────────────────────────────────────────────────── */

/* The OpenPencil headless rasterizer draws only the families it bundles. A text
 * node set in any other family is correct in the file and blank in a PNG proof,
 * which reads as a broken export. Resolve once, say why, keep going. */
const RENDERABLE = new Set([
  'inter',
  'jetbrains mono',
  'roboto',
  'roboto mono',
  'open sans',
  'lato',
  'source sans pro',
  'source serif pro',
  'ibm plex sans',
  'ibm plex mono',
  'ibm plex serif',
  'noto sans',
  'noto serif',
  'fira sans',
  'fira code',
])

const requestedFigFont = opt['fig-font'] || ''
let figFont = families.reading
let figFontNote = ''
if (requestedFigFont) {
  figFont = requestedFigFont === 'brand' ? families.reading : requestedFigFont
} else if (!RENDERABLE.has(String(families.reading).toLowerCase())) {
  figFont = 'Inter'
  figFontNote = `${families.reading} is not bundled with the headless rasterizer, so the .fig index pages use Inter; the Figma plugin still uses ${families.reading}. Pass --fig-font brand to keep the brand face in the file.`
}

/* contrast pairs, as the brand publishes them — including the one that fails */
const contrast = (Array.isArray(tokens.contrast) ? tokens.contrast : [])
  .map((c) => ({
    pair: c.pair || c.label || '',
    fg: c.fg || c.a || '',
    bg: c.bg || c.b || '',
    ratio: Number(c.ratio) || 0,
  }))
  .filter((c) => c.pair && c.fg && c.bg)

/* a raster plate: the material the identity is printed on */
async function loadPlate(dir) {
  if (!dir || !existsSync(dir)) return null
  const files = await readdir(dir)
  const hit = files.find((f) => /^(painting|texture|material|background|grain)\.(webp|png|jpg|jpeg)$/i.test(f))
  if (!hit) return null
  const src = join(dir, hit)
  /* the normalised copy goes to the system temp dir — writing it beside the
   * brand asset left a stray .plate.jpg inside public/brand/<slug>/ */
  const tmp = join(tmpdir(), 'figma-forge-plate-' + slug + '.jpg')
  /* webp is not guaranteed to decode in the runtime; sips normalises and
   * downscales it, which also keeps the generated script under a few hundred KB */
  if (existsSync('/usr/bin/sips')) {
    try {
      execFileSync('sips', ['-s', 'format', 'jpeg', '-s', 'formatOptions', '72', '-Z', '1400', src, '--out', tmp], {
        stdio: 'ignore',
      })
    } catch (e) {
      return null
    }
  } else {
    return null
  }
  const b64 = (await readFile(tmp)).toString('base64')
  return { name: hit, base64: b64 }
}

const plate = await loadPlate(brandDir)

/* fonts: resolve the brand's stacks to files, then outline every string */
const fontDirs = []
for (const d of [brandDir, ...(opt['font-dir'] ? [].concat(opt['font-dir']) : [])]) if (d) fontDirs.push(resolve(d))
/* every brand folder in the repo ships its own assets/; the mono face is often
 * only in one of them */
const brandRoot = join(resolve(dirname(tokensPath), '..', '..', '..'), 'design', 'brand')
for (const guess of [
  'design/brand/assets',
  join(brandRoot, 'assets'),
  join(resolve(dirname(tokensPath), '..', '..'), 'design', 'brand', 'assets'),
  join(resolve(dirname(tokensPath), '..'), 'assets'),
]) {
  if (existsSync(guess)) fontDirs.push(resolve(guess))
}
if (existsSync(brandRoot)) {
  for (const d of await readdir(brandRoot)) {
    const assets = join(brandRoot, d, 'assets')
    if (existsSync(assets)) fontDirs.push(assets)
  }
}

function pickFont(stack, voice) {
  const hit = glyphs.resolveFamily(stack, fontDirs)
  if (hit) return { ...hit, key: hit.path, substituted: false, wanted: stack }
  const fb = glyphs.fallbackFor(voice, fontDirs)
  if (fb) return { ...fb, key: fb.path, substituted: true, wanted: stack }
  return null
}

const fonts = {
  display: pickFont(families.display, 'serif'),
  reading: pickFont(families.reading, 'sans'),
  label: pickFont(families.label, 'mono'),
}
if (!fonts.reading) die('no readable font file for the reading face — pass --font-dir with a folder of .ttf files')
const fontNotes = Object.entries(fonts)
  .filter(([, f]) => f && f.substituted)
  .map(([voice, f]) => `${voice}: ${f.wanted} → ${f.family} (${basename(f.path)})`)

const DATA = {
  slug,
  name: opt.name || tokens.$meta?.name || tokens.meta?.name || slug,
  essence: opt.essence || tokens.$meta?.essence || tokens.meta?.essence || '',
  meta: {
    name: tokens.$meta?.name || tokens.name || opt.name || slug,
    version: (tokens.$meta?.version || tokens.version || '1.0.0') + '',
    date: new Date().toISOString().slice(0, 10),
  },
  track: tokens.track || '',
  material: tokens.material || '',
  sample: override.samples?.display || (opt.name || tokens.name || slug),
  contrast,
  cast,
  image: plate ? plate.name : '',
  images: plate ? { background: plate.base64 } : {},
  fontNotes,
  colours: {
    primitive,
    semantic,
    paper: colours.paper,
    raised: colours.raised,
    ink: colours.ink,
    inkMuted: colours.inkMuted,
    accent: colours.accent,
    onAccent: colours.onAccent,
    line: colours.line,
    danger: colours.danger,
    darkGround: colours.darkGround,
  },
  type: { families, roles: typeRoles },
  figFont,
  /* true when --fig-font resolved to the brand's own reading face, so the type
   * specimen may use each role's real family instead of one fallback */
  figBrand: figFont === families.reading,
  space,
  radius,
  motion,
  effects: Array.isArray(tokens.shadow) ? entries(tokens.shadow).map((e) => ({ name: e.name, hex: inkColour })) : [],
  grid: { base: (space.find((s) => s.px === 8) || space[0] || {}).px || 8, columns: 12, gutter: 24 },
  samples: override.samples || {},
  assets,
  sections,
  mode: htmlPath ? 'polish' : 'board',
}

/* the board is drawn after DATA exists, because it is drawn from DATA */
if (DATA.mode === 'board') {
  DATA.board = buildBoard(DATA, glyphs, fonts)
  const broken = DATA.board.filter((s) => s.error)
  if (broken.length) console.error('  ! board sections failed: ' + broken.map((b) => b.id + ' (' + b.error + ')').join(', '))
}

/* ── emit ────────────────────────────────────────────────────────────────── */

const readTpl = async (name) => readFile(join(TEMPLATES, name), 'utf8')
const inject = (tpl, data) => tpl.replace('__DATA__', JSON.stringify(data))

function variablesJson() {
  const rgb = (hex, alpha) => {
    let h = hex.replace('#', '')
    const n = parseInt(h, 16)
    return {
      r: +(((n >> 16) & 255) / 255).toFixed(4),
      g: +(((n >> 8) & 255) / 255).toFixed(4),
      b: +((n & 255) / 255).toFixed(4),
      a: alpha == null ? 1 : alpha,
    }
  }
  const colourVars = new Map()
  for (const p of primitive) {
    colourVars.set(p.name, { name: p.name, type: 'COLOR', valuesByMode: { Light: rgb(p.hex, p.alpha), Dark: rgb(p.hex, p.alpha) } })
  }
  for (const scope of ['light', 'dark']) {
    const mode = scope === 'light' ? 'Light' : 'Dark'
    for (const s of semantic[scope]) {
      const existing = colourVars.get(s.name) || { name: s.name, type: 'COLOR', valuesByMode: {} }
      existing.valuesByMode[mode] = rgb(s.hex, s.alpha)
      colourVars.set(s.name, existing)
    }
  }
  const collections = [
    {
      name: 'Colour',
      modes: [
        { modeId: 'light', name: 'Light' },
        { modeId: 'dark', name: 'Dark' },
      ],
      variables: [...colourVars.values()],
    },
  ]
  for (const [name, list] of [
    ['Spacing', space],
    ['Radius', radius],
    ['Motion', motion],
  ]) {
    if (!list.length) continue
    collections.push({
      name,
      modes: [{ modeId: 'default', name: 'Default' }],
      variables: list.map((t) => ({ name: t.name, type: 'FLOAT', valuesByMode: { Default: t.px } })),
    })
  }
  return { collections }
}

function readme() {
  const fontRows = shippedFonts
    .map((f) => `| ${f.voice} | ${f.family}${f.substituted ? ' (asked for ' + f.wanted + ')' : ''} | \`fonts/${f.file}\` |`)
    .join('\n')
  const html = htmlPath ? basename(htmlPath) : 'design-system.html'
  const css = cssPath ? basename(cssPath) : '<slug>-tokens.css'
  const lines = [
    `# ${DATA.name} — Figma export`,
    '',
    `Generated by \`scripts/figma-forge.mjs\` from \`${basename(tokensPath)}\`.`,
    'Do not edit by hand; re-run the forge after the tokens change.',
    '',
    '## What is here',
    '',
    '| File | For |',
    '| --- | --- |',
    '| `manifest.json` + `code.js` | the Figma plugin: variables, styles, components, pages |',
    '| `tokens.figma.json` | variables-only import, if the plugin route is blocked |',
    '| `openpencil.build.js` | the headless `.fig` pass, run by the OpenPencil CLI |',
    '| `assets/` | the brand SVGs, sanitised for vector import |',
    '| `fonts/` | the faces the board was drawn with |',
    '',
    '## The type',
    '',
    'A `.fig` stores **family names, not font data** — no tool can embed a font in',
    'one. So the file names the real faces and this folder carries the files:',
    '',
    '| Voice | Family | File |',
    '| --- | --- | --- |',
    fontRows,
    '',
    'Drag them onto Font Book once and the export is exact everywhere. Without',
    'them, Figma substitutes and the layout still holds.',
    '',
    'The display voice is also **outlined**, because the headless rasterizer will',
    'not substitute a serif at all — a Georgia node draws blank. Outlines cannot',
    'lose a typeface; that is why the cover reads correctly in a proof render.',
    '',
    '## Run it in Figma',
    '',
    '1. Open Figma desktop → **Plugins → Development → Import plugin from manifest…**',
    '2. Choose `manifest.json` in this folder.',
    `3. Run **Plugins → Development → ${DATA.name} design system**.`,
    '4. Save the file as `.fig` (**File → Save local copy**).',
    '',
    'The plugin builds, in order: a `Colour` collection with Light and Dark modes,',
    'paint styles bound to those variables, text styles from the type roles,',
    'spacing/radius/motion number variables, then one page per group — cover,',
    'colour, type, space and radius, marks, components.',
    '',
    '## Check it without Figma',
    '',
    '```bash',
    `node scripts/figma-smoke.mjs ${join('design', 'figma', slug, 'code.js')}`,
    '```',
    '',
    'Runs the plugin against a stub of the Figma API and prints what it built.',
    'A plugin that has never been opened is a plugin nobody has tested.',
    '',
    '## Run it without Figma',
    '',
    'From the repository root:',
    '',
    '```bash',
    `openpencil import ${html}${cssPath ? ' --css ' + css : ''} -o ${slug}.fig --pageName "Design System"`,
    `openpencil eval ${slug}.fig -w --stdin < ${join('design', 'figma', slug, 'openpencil.build.js')}`,
    `openpencil info ${slug}.fig`,
    '```',
    '',
    '## What this export does not carry',
    '',
    '- **Live data.** No component reads a real API; states are drawn, not wired.',
    '- **A substituted proof.** A PNG rendered headlessly falls back to Inter for',
    '  every family it does not bundle. The file is correct; the raster is not.',
    '  Open the `.fig` with `fonts/` installed to see the real thing.',
    '- **A page\'s breakpoints.** One viewport is imported. A 390px layout is a',
    '  separate frame somebody has to draw, not something the export derives.',
    '- **Effects the tokens do not describe.** No glass, grain or dither is invented.',
    '- **The wordmark as text.** It is imported as vector outlines, which is the',
    '  point: a font failure must not change the name.',
    '',
  ]
  if (!assets.length) lines.push('> No `--brand` folder was passed, so no marks were exported.', '')
  return lines.join('\n')
}

/* ── check ───────────────────────────────────────────────────────────────── */

const summary = {
  slug,
  name: DATA.name,
  primitives: primitive.length,
  semantic: { light: semantic.light.length, dark: semantic.dark.length },
  typeRoles: typeRoles.length,
  families,
  space: space.length,
  radius: radius.length,
  motion: motion.length,
  assets: assets.length,
  sections: sections.length,
  mode: DATA.mode,
  figFont,
}

if (opt.check) {
  console.log(JSON.stringify(summary, null, 2))
  if (figFontNote) console.error('\n  · ' + figFontNote)
  process.exit(0)
}

/* ── write ───────────────────────────────────────────────────────────────── */

await mkdir(outDir, { recursive: true })
await mkdir(join(outDir, 'assets'), { recursive: true })

const written = []
const put = async (name, body) => {
  const p = join(outDir, name)
  await writeFile(p, body)
  written.push(name)
}

if (opt.target === 'figma' || opt.target === 'both') {
  await put(
    'manifest.json',
    JSON.stringify(
      {
        name: DATA.name + ' design system',
        id: 'brand-forge-' + slug + '-' + Date.now().toString(36),
        api: '1.0.0',
        main: 'code.js',
        editorType: ['figma'],
        networkAccess: { allowedDomains: ['none'] },
      },
      null,
      2
    ) + '\n'
  )
  /* the plugin carries tokens, not the board's drawing ops — without this the
   * plugin is 780KB of glyph chunks it will never use */
  const pluginData = { ...DATA }
  delete pluginData.board
  delete pluginData.images
  await put('code.js', inject(await readTpl('figma-plugin.js'), pluginData))
  await put('tokens.figma.json', JSON.stringify(variablesJson(), null, 2) + '\n')
}

if (opt.target === 'openpencil' || opt.target === 'both') {
  const tpl = DATA.mode === 'board' ? 'openpencil-board.js' : 'openpencil-build.js'
  await put(DATA.mode === 'board' ? 'openpencil-board.js' : 'openpencil.build.js', inject(await readTpl(tpl), DATA))
}

for (const a of assets) {
  await writeFile(join(outDir, 'assets', a.file), a.svg)
}

/* Ship the faces the board was drawn with. A .fig stores family names, not font
 * data, so this is the only way a file can arrive with its typography intact:
 * one drag onto Font Book and the export is exact. */
const shippedFonts = []
await mkdir(join(outDir, 'fonts'), { recursive: true })
for (const [voice, f] of Object.entries(fonts)) {
  if (!f) continue
  const dest = join(outDir, 'fonts', basename(f.path))
  try {
    await copyFile(f.path, dest)
    shippedFonts.push({ voice, family: f.family, file: basename(f.path), substituted: f.substituted, wanted: f.wanted })
  } catch (e) {
    /* a system font that cannot be copied still resolves on this machine */
  }
}
await put('README.md', readme())

/* ── optionally build the .fig ───────────────────────────────────────────── */

let figPath = ''
if (opt.run && (opt.target === 'openpencil' || opt.target === 'both')) {
  const figOut = join(outDir, slug + '.fig')
  try {
    if (htmlPath && existsSync(htmlPath)) {
      const args = ['import', htmlPath, '-o', figOut, '--pageName', 'Design System']
      if (cssPath && existsSync(cssPath)) args.push('--css', cssPath)
      execFileSync('openpencil', args, { stdio: 'inherit' })
    } else {
      /* no page to import: a 1×1 seed gives eval a valid document to open */
      const seed = join(outDir, 'assets', '_seed.svg')
      await writeFile(
        seed,
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect width="1" height="1" fill="' +
          colours.paper +
          '"/></svg>'
      )
      execFileSync('openpencil', ['import', seed, '-o', figOut, '--pageName', 'Design System'], {
        stdio: 'inherit',
      })
    }
    const scriptName = DATA.mode === 'board' ? 'openpencil-board.js' : 'openpencil.build.js'
    const buildScript = await readFile(join(outDir, scriptName), 'utf8')
    /* stdin, not -c: a board with outlined type and an embedded plate is far
     * larger than a single command-line argument allows */
    const result = spawnSync('openpencil', ['eval', figOut, '-w', '--stdin'], {
      input: buildScript,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    })
    if (result.status !== 0) throw new Error((result.stderr || '').trim().slice(0, 400))
    figPath = figOut
    console.log((result.stdout || '').trim())
  } catch (e) {
    console.error('  ! the .fig pass failed: ' + (e.message || e))
    console.error('    the plugin bundle is still written; Figma does not need this step.')
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      out: outDir,
      written,
      fig: figPath || undefined,
      note: figFontNote || undefined,
      summary,
    },
    null,
    2
  )
)
