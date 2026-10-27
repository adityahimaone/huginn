# Putting Huginn into an app

The specimen is a reference, not a website. This is how it becomes a working
surface in a Next.js project.

---

## Why `components/ui` matters

shadcn is not a component library you install — it is a convention for **owning**
components. The CLI copies source into your repo at `components/ui/`, wired to
your path aliases, your Tailwind config and your `cn()` helper. From that moment
the file is yours: you can change it, and no upstream release can change it back.

That has three consequences worth stating plainly:

1. **The registry is a starting point, not a dependency.** There is no version to
   upgrade, so there is no version to break you.
2. **`components/ui` is the boundary.** Primitives live there and are dumb.
   Anything that knows about your business lives in `components/` or `app/`.
   A footer that hardcodes your navigation is not a `ui` primitive — it is a
   composed block, which is why `huginn-footer.tsx` takes `columns` as a prop
   instead of importing a nav config.
3. **It assumes a stack**: React, TypeScript, Tailwind, and the `@/*` alias.
   Without those three the convention buys you nothing.

The Huginn footer follows the convention but inverts one assumption: it is styled
by a **generated CSS file**, not by Tailwind classes. That is deliberate. The
footer's geometry is canvas work, container queries and keyframed clip-paths —
utility classes would be a transcription of the CSS, not a simplification of it.
Everything else in the system maps cleanly onto Tailwind, and the tokens below
are how.

---

## 1. If the project already has shadcn

```
npx shadcn@latest init
```

That gives you `components/ui/`, `lib/utils.ts`, the `@/*` alias and Tailwind.
Skip to step 3.

## 2. If it does not

```bash
# Next.js + TypeScript
npx create-next-app@latest huginn-app --typescript --tailwind --app --eslint

cd huginn-app
npx shadcn@latest init

# Confirm the alias resolves; shadcn writes it for you, but check:
#   "paths": { "@/*": ["./*"] }
```

Tailwind v4 needs no config file. If you are on v3, keep
`content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}']` so the generated
CSS file's classes survive purging — or import that CSS unlayered, which is
simpler.

## 3. Copy the files

```
components/ui/huginn-footer.tsx     the component
components/ui/huginn-footer.css     generated from the specimen
lib/wild-hunt.js                    geometry + controller (generated)
lib/wild-hunt.d.ts                  types for the above
tokens/huginn.tokens.css            the token layer
brand/assets/*                      painting + riders
public/brand/…                      the SVGs and favicons you want served
```

```bash
cp components/ui/huginn-footer.*  ~/huginn-app/components/ui/
cp lib/wild-hunt.*                ~/huginn-app/lib/
mkdir -p ~/huginn-app/tokens ~/huginn-app/public/brand
cp tokens/huginn.tokens.css       ~/huginn-app/tokens/
cp -r brand/assets brand/*.svg    ~/huginn-app/public/brand/
```

`tsconfig.json` needs `allowJs: true` for `lib/wild-hunt.js`, and the ambient
declarations in `types/globals.d.ts` if your project does not already declare
`*.css`.

## 4. Load the tokens once

In `app/layout.tsx`, before your own styles so your overrides can win:

```tsx
import '@/tokens/huginn.tokens.css'
import './globals.css'
```

Every colour in the footer resolves through these roles — `--accent-field`,
`--ink-on-field`, `--focus`, `--dur-resolve` — with a hardcoded vermilion as the
last-resort fallback. That fallback is why the footer still paints correctly if
someone forgets this import, and why you should still not forget it.

### Optional: give Tailwind the same names

Tailwind v4 reads `@theme`, so the token file maps in directly:

```css
@import 'tailwindcss';
@import '../tokens/huginn.tokens.css';

@theme inline {
  --color-surface:        var(--surface);
  --color-surface-raised: var(--surface-raised);
  --color-ink:            var(--ink);
  --color-ink-muted:      var(--ink-muted);
  --color-field:          var(--accent-field);
  --color-accent:         var(--accent);
  --color-focus:          var(--focus);

  --font-reading: var(--font-reading);
  --font-label:   var(--font-label);

  --radius-none: 0px;
}
```

Now `bg-field`, `text-ink-muted`, `font-label` and `ring-focus` all resolve to
the same values as the specimen, from one source.

## 5. Mount the footer

```tsx
// app/page.tsx
import { HuginnFooter } from '@/components/ui/huginn-footer'

export default function Page() {
  return (
    <>
      <main>{/* … */}</main>
      <HuginnFooter />
    </>
  )
}
```

With real navigation:

```tsx
<HuginnFooter
  word="HUGINN"
  preset="vermilion"
  columns={[
    { heading: 'Work',    links: [{ label: 'Index', href: '/work' }] },
    { heading: 'Studio',  links: [{ label: 'About', href: '/about' }] },
    { heading: 'Contact', links: [{ label: 'hello@huginn.studio', href: 'mailto:hello@huginn.studio' }] },
  ]}
  onBackToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
/>
```

`huginn-footer.tsx` is a client component (`'use client'`): it owns a canvas, a
`ResizeObserver` and a pointer loop. Do not try to make it a server component —
render it from one, which is fine, since `'use client'` marks the boundary
rather than the page.

## 6. Serve the specimen at `/design-system/huginn`

Two ways, depending on whether the sheet should be public.

**A — the specimen as a static route** (it is one file, no build step):

```bash
mkdir -p ~/huginn-app/public/design-system/huginn
cp -r design-system.html tokens brand public/design-system/huginn/
```

It is then at `/design-system/huginn/design-system.html`. Add a redirect if you
want the clean path:

```js
// next.config.js
module.exports = {
  async redirects() {
    return [
      {
        source: '/design-system/huginn',
        destination: '/design-system/huginn/design-system.html',
        permanent: false,
      },
    ]
  },
}
```

**B — the specimen as a route** (so it inherits your layout, auth, or a
`noindex`):

```tsx
// app/design-system/huginn/page.tsx
import fs from 'node:fs/promises'
import path from 'node:path'

export const metadata = { title: 'Huginn — design system', robots: { index: false } }

export default async function Specimen() {
  const html = await fs.readFile(
    path.join(process.cwd(), 'public/design-system/huginn/design-system.html'),
    'utf8',
  )
  const body = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)?.[1] ?? ''
  // The sheet ships its own <style> and <script>; render them as-is.
  return <div dangerouslySetInnerHTML={{ __html: body }} />
}
```

Option B is a shortcut with a real cost: the specimen's own `<html>`, `<head>`
and theme script are dropped, so dark mode will not restore from
`localStorage`. If the sheet matters, prefer A and link to it.

## 7. Regenerating after you change the specimen

```bash
node scripts/build-tokens.mjs      # tokens/*.css + *.json
node scripts/build-brand.mjs       # brand/*.svg + favicons
node scripts/inline-brand.mjs      # symbols back into design-system.html
node scripts/build-component.mjs   # lib/wild-hunt.js + huginn-footer.css
```

Run them in that order. `build-component.mjs` reads `design-system.html` by line
markers, so it fails loudly if the footer block has moved — which is the point:
a silent empty file would be worse.

## 8. Things that will bite

| Symptom | Cause | Fix |
| --- | --- | --- |
| Footer is a flat red block, no painting | `brand/assets/*` not copied, or path mismatch | the component defaults to `/brand/assets/…` under `public/` |
| Dissolve missing but painting shows | canvas has zero height | the footer needs an explicit height; the default is `min(92svh, 780px)` |
| Wordmark invisible | tokens not loaded and `--whf-ink` unset | import `tokens/huginn.tokens.css` |
| `Cannot find module '@/lib/wild-hunt'` | `allowJs` off, or `.d.ts` not copied | enable `allowJs`, copy `lib/wild-hunt.d.ts` |
| Hydration warning on `style` | the specimen sets `style` as a string; React needs an object | the component already uses objects, including `'--d'` casts |
| Tailwind purges the footer styles | v3 `content` globs miss a `.css` import | import the CSS unlayered, or add it to `content` |
| Footer columns unreadable | someone reintroduced opacity to "soften" them | on the field, use size and tracking — see `brand/DESIGN.md` §4 |

## 9. The one rule to carry across

The footer is the system's signature surface, and it is the easiest place to
undo the system by accident. Three edits will do it: dim a caption, set the
wordmark as text, or round a corner. All three look reasonable in isolation and
all three are recorded as forbidden in `brand/DESIGN.md` §11, with the measured
reason attached.
