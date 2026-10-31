#!/usr/bin/env node
/**
 * glyphs — turn a string into a vector path, using a real font file.
 *
 *   node scripts/glyphs.mjs --list
 *   node scripts/glyphs.mjs --family "Iowan Old Style, Georgia" --size 84 --text "Clearing"
 *
 * Why: the OpenPencil headless rasterizer ships one face (Inter). A text node set
 * in any other family is correct in the file and **blank in a PNG proof** —
 * `Font substitution` then nothing. `@font-face` in the imported CSS is ignored,
 * so a font cannot be shipped with the document either.
 *
 * Outlining sidesteps all of it. The glyphs are the brand's actual outlines, the
 * proof renders anywhere, and no one has to install a font to see the system.
 * The cost is that the text is no longer editable — which is why the Figma plugin
 * (figma-forge --target figma) still emits live text with real text styles.
 *
 * Resolution walks the CSS font stack and looks for a file it can parse:
 *   - `.ttf` and `.otf` parse; `.ttc` (a collection) and `.woff2` do not.
 *   - brand folders are searched before the system, so a shipped Geist wins over
 *     whatever happens to be installed.
 * A family with no readable file falls through the stack; if the whole stack
 * fails, the caller gets `null` and must decide, not guess.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import { homedir } from 'node:os'

import { createRequire } from 'node:module'

/* opentype.js is CommonJS and lives outside this skill; resolve it from wherever
 * it is installed rather than vendoring a 300KB parser. */
const require = createRequire(import.meta.url)
const ot = (() => {
  const roots = [
    process.cwd(),
    join(homedir(), ''),
    '/Users/adityahimawan',
  ]
  for (const root of roots) {
    for (const id of ['opentype.js', join(root, 'node_modules', 'opentype.js')]) {
      try {
        return require(id)
      } catch (e) {
        /* next */
      }
    }
  }
  return null
})()
if (!ot) {
  console.error('glyphs.mjs needs opentype.js: npm i opentype.js')
}

export const SYSTEM_DIRS = [
  '/System/Library/Fonts/Supplemental',
  '/System/Library/Fonts',
  '/Library/Fonts',
  join(homedir(), 'Library/Fonts'),
]

const READABLE = /\.(ttf|otf)$/i

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '')

const WEIGHT = /(bold|italic|light|medium|black|thin|extra|semi|condensed|extended|oblique|book|heavy|ultra)/i

/**
 * family → candidate file paths, brand folders first, best match first.
 *
 * `readdir` returns Georgia Bold Italic before Georgia, so a plain prefix match
 * picks the wrong file and the specimen is bold-italic. Score it: exact stem
 * beats a prefix, and any weight word in the filename is a penalty.
 */
function candidates(family, extraDirs = []) {
  const want = norm(family)
  if (!want) return []
  const scored = []
  for (const [i, dir] of [...extraDirs, ...SYSTEM_DIRS].entries()) {
    if (!existsSync(dir)) continue
    let files
    try {
      files = readdirSync(dir)
    } catch (e) {
      continue
    }
    for (const f of files) {
      if (!READABLE.test(f)) continue
      const raw = f.replace(/\.[^.]+$/, '')
      const stem = norm(raw)
      /* `want.startsWith(stem)` used to match here, which let Geist.ttf answer
       * for "Geist Mono" and the mono labels came out in the sans. A shorter
       * stem is a different family; only the requested name or a variant of it
       * (`GeistMono-Bold`) counts. */
      if (!(stem === want || stem.startsWith(want))) continue
      let score = stem === want ? 0 : 1
      if (WEIGHT.test(raw)) score += 10
      score += i * 0.01 /* earlier dir wins ties: brand before system */
      scored.push({ path: join(dir, f), score })
    }
  }
  return scored.sort((a, b) => a.score - b.score).map((x) => x.path)
}

const cache = new Map()

/** Load a font file, returning { font, path } or null. */
export function loadFile(path) {
  if (cache.has(path)) return cache.get(path)
  let result = null
  try {
    const buf = readFileSync(path)
    const font = ot.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
    result = { font, path }
  } catch (e) {
    result = null
  }
  cache.set(path, result)
  return result
}

/**
 * Resolve a CSS font stack to a readable font file.
 * Returns { family, path, font, substituted } or null.
 */
export function resolveFamily(stack, extraDirs = []) {
  const families = String(stack || '')
    .split(',')
    .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    .filter((s) => s && !/^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-.*|inherit|initial)$/i.test(s))

  for (const family of families) {
    for (const path of candidates(family, extraDirs)) {
      const hit = loadFile(path)
      if (hit) return { family, path, font: hit.font, substituted: false }
    }
  }
  return null
}

/** A last resort per voice, when the brand's own stack has no readable file. */
export function fallbackFor(voice, extraDirs = []) {
  const chains = {
    serif: ['Georgia', 'Times New Roman', 'Baskerville', 'Palatino'],
    sans: ['Geist', 'Helvetica', 'Arial', 'Verdana'],
    mono: ['Geist Mono', 'Andale Mono', 'Courier New', 'Menlo'],
  }
  const list = chains[voice] || chains.sans
  for (const family of list) {
    for (const path of candidates(family, extraDirs)) {
      const hit = loadFile(path)
      if (hit) return { family, path, font: hit.font, substituted: true }
    }
  }
  return null
}

/**
 * Outline a string at its final position.
 *
 * Position is **baked into the path**, not carried by a transform. The runtime's
 * SVG importer truncates a path that is placed with `transform="translate(…) scale(…)"`
 * — "Clearing" rendered as "Cle" — and draws it exactly when the coordinates are
 * absolute. That is the whole reason this function takes x and y.
 *
 * `y` is the top of the ink, not the baseline: a caller laying out a page thinks
 * in boxes, and the baseline is an implementation detail of the font.
 *
 * Returns { d, width, height, advance } in px.
 */
export function outline(font, text, size, opts = {}) {
  const str = String(text)
  const tracking = (opts.tracking || 0) * size
  const x0 = opts.x || 0
  const yTop = opts.y || 0

  const whole = font.getPath(str, 0, 0, size).getBoundingBox()
  const baseline = yTop - whole.y1

  let cx = x0
  const parts = []
  for (const ch of str) {
    const glyph = font.charToGlyph(ch)
    const gp = font.getPath(ch, cx, baseline, size)
    const gb = gp.getBoundingBox()
    if (gb.x2 > gb.x1) parts.push(gp.toPathData(1))
    cx += (glyph.advanceWidth / font.unitsPerEm) * size + tracking
  }

  return {
    d: parts.join(' '),
    width: whole.x2 - whole.x1,
    height: whole.y2 - whole.y1,
    advance: cx - x0 - (str.length ? tracking : 0),
  }
}

/**
 * Outline a string as a series of short paths.
 *
 * One path per string fails past roughly twenty sub-paths — a 34-character
 * sentence came back as its first two glyphs — while a twelve-glyph path is
 * exact. So the caller gets chunks, each with its own box, and places one node
 * per chunk. The type is then the brand's real outlines at any length.
 */
export function chunks(font, text, size, opts = {}) {
  /* Short chunks. A long path loses glyphs in the importer and a path drawn from
   * its own origin lands in the wrong place, so the only thing that has held up
   * is absolute coordinates in small groups. Six is the largest that survived
   * every position on the page. */
  const max = opts.maxGlyphs || 6
  const tracking = (opts.tracking || 0) * size
  const str = String(text)
  const whole = font.getPath(str, 0, 0, size).getBoundingBox()
  const baseline = (opts.y || 0) - whole.y1

  let cx = opts.x || 0
  const out = []
  let parts = []
  let count = 0
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  const flush = () => {
    if (!parts.length) return
    const w = Math.max(maxX - minX, 0.5)
    const h = Math.max(maxY - minY, 0.5)
    out.push({ d: parts.join(' '), vb: [minX, minY, w, h], x: minX, y: minY, w, h })
    parts = []
    count = 0
    minX = Infinity
    minY = Infinity
    maxX = -Infinity
    maxY = -Infinity
  }

  for (const ch of str) {
    const glyph = font.charToGlyph(ch)
    const gp = font.getPath(ch, cx, baseline, size)
    const gb = gp.getBoundingBox()
    if (gb.x2 > gb.x1) {
      parts.push(gp.toPathData(1))
      minX = Math.min(minX, gb.x1)
      minY = Math.min(minY, gb.y1)
      maxX = Math.max(maxX, gb.x2)
      maxY = Math.max(maxY, gb.y2)
      count += 1
      if (count >= max) flush()
    }
    cx += (glyph.advanceWidth / font.unitsPerEm) * size + tracking
  }
  flush()

  return { chunks: out, width: whole.x2 - whole.x1, height: whole.y2 - whole.y1, advance: cx - (opts.x || 0) }
}

/** Measure without emitting. */
export function measure(font, text, size, opts = {}) {
  const g = outline(font, text, size, { ...opts, x: 0, y: 0 })
  return { width: g.width, height: g.height, advance: g.advance }
}

/* ── cli ─────────────────────────────────────────────────────────────────── */

const isMain = process.argv[1] && process.argv[1].endsWith('glyphs.mjs')
if (isMain) {
  const argv = process.argv.slice(2)
  const one = (n, d) => {
    const i = argv.indexOf(`--${n}`)
    return i === -1 ? d : argv[i + 1]
  }
  const extra = argv.reduce((acc, a, i) => (a === '--dir' ? [...acc, argv[i + 1]] : acc), [])
  if (argv.includes('--list')) {
    for (const family of [
      'Iowan Old Style',
      'Palatino',
      'Georgia',
      'Charter',
      'Baskerville',
      'Geist',
      'Geist Mono',
      'JetBrains Mono',
      'SF Mono',
      'Menlo',
      'Andale Mono',
      'Helvetica Neue',
      'Arial',
    ]) {
      const hit = resolveFamily(family, extra)
      console.log((hit ? '✓ ' : '✗ ') + family.padEnd(20) + (hit ? hit.path : '(no readable .ttf/.otf)'))
    }
    process.exit(0)
  }
  const stack = one('family', 'Georgia')
  const size = Number(one('size', 48))
  const text = one('text', 'Clearing')
  const hit = resolveFamily(stack)
  if (!hit) {
    console.error(`no readable font file for "${stack}"`)
    process.exit(1)
  }
  const out = outline(hit.font, text, size)
  console.log(JSON.stringify({ family: hit.family, path: hit.path, ...out }))
}
