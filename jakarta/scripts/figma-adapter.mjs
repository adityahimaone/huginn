// Adapter: src/tokens.json → the shape figma-forge.mjs reads.
//
// The forge expects a flat `color` map plus `semantic.light` / `semantic.dark`
// whose values name a primitive through `var(--…-key)`. Jakarta stores the same
// information as primitive *keys* and calls its dark scope `night`. Translating
// here keeps one source of truth: this file is generated, never edited, and the
// plugin is regenerated from it.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
const t = JSON.parse(readFileSync(ROOT + 'src/tokens.json', 'utf8'))
const NS = t.namespace

const role = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, `var(--${NS}-${v})`]))

const out = {
  name: t.name,
  slug: t.slug,
  claim: t.claim,
  color: t.color,
  semantic: { light: role(t.semantic.light), dark: role(t.semantic.night) },
  space: t.space,
  radius: t.radius,
  shadow: t.shadow,
  motion: t.motion,
  type: Object.fromEntries(
    t.type.map((s) => [
      s.key,
      // DTCG shape: $value is the size, so the forge keeps the line height and
      // tracking that belong to the role instead of falling back to 1.3 / 0.
      { $value: s.size, $lineHeight: s.lh, $tracking: `${s.track}em`, $weight: s.weight },
    ]),
  ),
}

mkdirSync(ROOT + 'design', { recursive: true })
writeFileSync(ROOT + 'design/tokens.figma.json', JSON.stringify(out, null, 2))
console.log('design/tokens.figma.json written')
