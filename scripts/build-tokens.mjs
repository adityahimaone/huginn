#!/usr/bin/env node
/**
 * The single token source. Emits tokens/huginn.tokens.css and .json.
 * Never hand-edit the outputs; edit here and re-run.
 *
 *   node scripts/build-tokens.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const OUT = resolve(import.meta.dirname, '..', 'tokens')
mkdirSync(OUT, { recursive: true })

/* ------------------------------------------------------------- primitives ---
   Five colours, all taken from the physical thing: the poster ink, the night
   sky in Arbo's painting, the bone of the sheet, the cobalt in the cloud, the
   pine below the riders. */
const P = {
  'vermilion-300': ['#FF5B4A', 'field ink, lifted for dark grounds'],
  'vermilion-500': ['#E2281B', 'the poster field. Display and fills only'],
  'vermilion-600': ['#C11D12', 'pressed field'],
  'vermilion-700': ['#A31810', 'field ink that must carry small type'],
  'cobalt-300': ['#93A4FF', 'focus ring on ink'],
  'cobalt-500': ['#1B2DB0', 'focus ring on bone. The only cold note'],
  'ink-950': ['#080706', 'sunken ground'],
  'ink-900': ['#100F0E', 'ink, and the dark ground'],
  'ink-800': ['#1B1815', 'raised ground in dark'],
  'bone-000': ['#FFFDF9', 'paper white. Small type on the field'],
  'bone-100': ['#F4EFE5', 'chalk. Raised ground, ink on dark'],
  'bone-200': ['#EBE5D8', 'the sheet'],
  'bone-300': ['#DFD6C3', 'sunken ground'],
  'bone-400': ['#C9BFA9', 'disabled ink'],
  'moss-300': ['#7FC49A', 'success on ink'],
  'moss-700': ['#2C5B45', 'success on bone'],
}

/* --------------------------------------------------------------- semantic ---
   Roles, not hexes. `ref` points at a primitive; `literal` is a value that has
   no primitive (a mix or an alpha). */
const LIGHT = {
  surface: { ref: 'bone-200', role: 'page ground' },
  'surface-raised': { ref: 'bone-100', role: 'cards, sheets, inputs' },
  'surface-sunken': { ref: 'bone-300', role: 'wells, code, inert areas' },
  ink: { ref: 'ink-900', role: 'body text, edges' },
  'ink-muted': { literal: '#5A5346', role: 'secondary text. 6.06:1 on the sheet' },
  'ink-on-field': { ref: 'bone-000', role: 'type under 18px on the poster field' },
  line: { literal: 'rgb(16 15 14 / 0.18)', role: 'hairlines, input edges' },
  'line-strong': { literal: 'rgb(16 15 14 / 0.42)', role: 'rules that must hold' },
  accent: { ref: 'vermilion-700', role: 'links, buttons, focus-adjacent action' },
  'accent-pressed': { literal: '#8E140D', role: 'pressed action' },
  'accent-field': { ref: 'vermilion-500', role: 'the loud field. Display and fills' },
  'accent-ink': { ref: 'bone-100', role: 'ink on accent' },
  focus: { ref: 'cobalt-500', role: 'focus ring. Never decorative' },
  danger: { ref: 'vermilion-700', role: 'error text and error edge' },
  ok: { ref: 'moss-700', role: 'success' },
  selection: { literal: 'rgb(226 40 27 / 0.22)', role: 'text selection' },
}

const DARK = {
  surface: { ref: 'ink-900', role: 'page ground' },
  'surface-raised': { ref: 'ink-800', role: 'cards, sheets, inputs' },
  'surface-sunken': { ref: 'ink-950', role: 'wells, code, inert areas' },
  ink: { ref: 'bone-100', role: 'body text, edges' },
  'ink-muted': { literal: '#A79E8C', role: 'secondary text. 7.21:1 on the ground' },
  'ink-on-field': { ref: 'ink-900', role: 'type under 18px on the poster field' },
  line: { literal: 'rgb(244 239 229 / 0.20)', role: 'hairlines, input edges' },
  'line-strong': { literal: 'rgb(244 239 229 / 0.46)', role: 'rules that must hold' },
  accent: { ref: 'vermilion-300', role: 'links, buttons, action' },
  'accent-pressed': { literal: '#FF7B6D', role: 'pressed action' },
  'accent-field': { ref: 'vermilion-500', role: 'the loud field' },
  'accent-ink': { ref: 'ink-900', role: 'ink on accent' },
  focus: { ref: 'cobalt-300', role: 'focus ring' },
  danger: { literal: '#FF7A66', role: 'error text' },
  ok: { ref: 'moss-300', role: 'success' },
  selection: { literal: 'rgb(255 91 74 / 0.26)', role: 'text selection' },
}

/* ---------------------------------------------------------------- other --- */
const SPACE = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64, 9: 96, 10: 128 }
const TYPE = {
  'text-display': ['clamp(2.75rem, 6.4vw, 5.25rem)', 0.94, '-0.035em', 'hero. serif, one per page'],
  'text-h2': ['clamp(1.9rem, 3.6vw, 2.9rem)', 1.02, '-0.025em', 'section title'],
  'text-h3': ['1.35rem', 1.16, '-0.012em', 'card and panel titles'],
  'text-body': ['1.0625rem', 1.58, '0', 'reading. 17px'],
  'text-small': ['0.9375rem', 1.5, '0', 'captions in prose, 15px'],
  'text-label': ['0.8125rem', 1.2, '0.09em', 'mono metadata, 13px'],
  'text-micro': ['0.75rem', 1.15, '0.1em', 'dense labels only, 12px'],
}
const MOTION = {
  'dur-press': ['120ms', 'button and field feedback'],
  'dur-ui': ['240ms', 'popover, disclosure'],
  'dur-wipe': ['520ms', 'captions and rules entering'],
  'dur-resolve': ['800ms', 'wordmark resolving 8 → 1 cells'],
  'dur-scene': ['1100ms', 'the footer entrance, once'],
}
const EASE = {
  out: ['cubic-bezier(.2, .7, .2, 1)', 'feedback, small moves'],
  sheet: ['cubic-bezier(.65, 0, .2, 1)', 'wipes, the flourish'],
  dither: ['steps(4, end)', 'block resolution, deliberately stepped'],
}

const hex = (name) => P[name][0]
const resolveColor = (t) => (t.ref ? hex(t.ref) : t.literal)

/* ------------------------------------------------------------------ css --- */
const cssVars = (obj) =>
  Object.entries(obj)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join('\n')

let css = `/* Huginn design system — tokens
 * Generated by scripts/build-tokens.mjs. Do not edit by hand.
 * Three layers: primitive → semantic → component. Components read roles.
 */

:root {
  color-scheme: light;

  /* primitives ------------------------------------------------------------ */
${Object.entries(P)
  .map(([k, v]) => `  --hug-${k}: ${v[0]}; /* ${v[1]} */`)
  .join('\n')}

  /* semantic -------------------------------------------------------------- */
${Object.entries(LIGHT)
  .map(([k, v]) => `  --${k}: ${v.ref ? `var(--hug-${v.ref})` : v.literal}; /* ${v.role} */`)
  .join('\n')}

  /* space ----------------------------------------------------------------- */
${Object.entries(SPACE)
  .map(([k, v]) => `  --s${k}: ${v}px;`)
  .join('\n')}

  /* type ------------------------------------------------------------------ */
  --font-sheet: none; /* the wordmark is a drawing, not a face */
  --font-reading: "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Charter, Georgia, "Times New Roman", serif;
  --font-label: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
${Object.entries(TYPE)
  .map(([k, v]) => `  --${k}: ${v[0]};`)
  .join('\n')}

  /* radius ---------------------------------------------------------------- */
  --radius: 0px; /* corners are cut, not rounded */
  --radius-pill: 999px; /* the switch, and nothing else */

  /* motion ---------------------------------------------------------------- */
${Object.entries(MOTION)
  .map(([k, v]) => `  --${k}: ${v[0]};`)
  .join('\n')}
${Object.entries(EASE)
  .map(([k, v]) => `  --ease-${k}: ${v[0]};`)
  .join('\n')}

  /* components ------------------------------------------------------------ */
  --topbar-h: 64px;
  --shell: 1180px;
  --gutter: clamp(1rem, 3vw, 2.5rem);
  --measure: 62ch;
  --control-h: 44px;
  --field-h: 46px;
  --border: 1px;
  --z-marks: 3;
  --z-sticky: 50;
}

[data-theme='dark'] {
  color-scheme: dark;

${Object.entries(DARK)
  .map(([k, v]) => `  --${k}: ${v.ref ? `var(--hug-${v.ref})` : v.literal}; /* ${v.role} */`)
  .join('\n')}
}
`

writeFileSync(resolve(OUT, 'huginn.tokens.css'), css)

/* ----------------------------------------------------------------- json --- */
const json = {
  $meta: {
    name: 'Huginn',
    version: '2.0.0',
    updated: '2026-10-27',
    note: 'Generated by scripts/build-tokens.mjs. The wordmark is a drawing; --font-sheet is deliberately empty.',
    contrast: 'Measured with scripts/contrast.mjs. See docs/huginn-design-system-audit.md.',
  },
  color: {
    primitive: Object.fromEntries(
      Object.entries(P).map(([k, v]) => [k, { $value: v[0], $type: 'color', $description: v[1] }]),
    ),
    light: Object.fromEntries(
      Object.entries(LIGHT).map(([k, v]) => [
        k,
        { $value: resolveColor(v), $type: 'color', $description: v.role, $ref: v.ref ? `color.primitive.${v.ref}` : undefined },
      ]),
    ),
    dark: Object.fromEntries(
      Object.entries(DARK).map(([k, v]) => [
        k,
        { $value: resolveColor(v), $type: 'color', $description: v.role, $ref: v.ref ? `color.primitive.${v.ref}` : undefined },
      ]),
    ),
  },
  space: Object.fromEntries(Object.entries(SPACE).map(([k, v]) => [k, { $value: `${v}px`, $type: 'dimension' }])),
  type: Object.fromEntries(
    Object.entries(TYPE).map(([k, v]) => [
      k,
      { $value: v[0], $type: 'typography', $lineHeight: v[1], $tracking: v[2], $description: v[3] },
    ]),
  ),
  motion: Object.fromEntries(
    Object.entries(MOTION).map(([k, v]) => [k, { $value: v[0], $type: 'duration', $description: v[1] }]),
  ),
  ease: Object.fromEntries(Object.entries(EASE).map(([k, v]) => [k, { $value: v[0], $type: 'cubicBezier', $description: v[1] }])),
  radius: { default: { $value: '0px', $type: 'dimension' }, pill: { $value: '999px', $type: 'dimension' } },
}
writeFileSync(resolve(OUT, 'huginn.tokens.json'), JSON.stringify(json, null, 2) + '\n')

const counts = {
  primitives: Object.keys(P).length,
  semantic: Object.keys(LIGHT).length,
  space: Object.keys(SPACE).length,
  type: Object.keys(TYPE).length,
  motion: Object.keys(MOTION).length + Object.keys(EASE).length,
}
console.log(JSON.stringify({ written: ['tokens/huginn.tokens.css', 'tokens/huginn.tokens.json'], counts }, null, 2))
