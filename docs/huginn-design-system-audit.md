# Huginn — design system audit

Every claim below points at a command you can run or a file you can open. Where
a check did not happen, the row says so. A specimen that hides its gaps is a
brochure.

Run from the project root.

---

## What is proved

### Contrast, measured on the rendered page

```
node scripts/audit-contrast.mjs --theme light
node scripts/audit-contrast.mjs --theme dark
```

Both exit 0. **43 elements × 2 themes, 0 failures.** The script does not compare
token pairs — it walks each element's ancestors, composites every background it
meets, folds in group `opacity`, and measures the colour that is actually
painted. That distinction matters: a 45%-white comment on a 28%-black panel over
an ink band is not a pair, it is a stack.

Selected results, light / dark:

| Element | Size | Light | Dark |
| --- | --- | --- | --- |
| Hero headline | 84 px | 15.26 | 16.71 |
| Hero lede | 19 px | 6.06 | 7.21 |
| Section numeral | 12 px | 6.21 | 6.24 |
| Section eyebrow | 12 px | 6.06 | 7.21 |
| Table cell | 14 px | 15.26 | 16.71 |
| Field hint | 13 px | 6.64 | 6.66 |
| Code comment | 12 px | 5.69 | 5.67 |
| Footer link | 12 px | 4.54 | 4.54 |
| Footer column head | 11 px | 4.54 | 4.54 |

The footer rows are the ceiling, not a target: paper white on the field vermilion
is 4.54:1 and nothing on that field can be better. See "what the audit changed".

### Keyboard and focus

```
node scripts/audit-motion.mjs
```

**53 interactive elements, all of which take focus and paint a ring.** The first
`Tab` lands on the skip link and it is visible when focused. The ring is 3 px
cobalt at 3 px offset — the only place cobalt appears, because it means "keyboard
focus here" and nothing else.

### Reduced motion

Same command, `reducedMotion: 'reduce'` context:

- nothing on the page animates with an infinite iteration count
- the footer commits its entrance (`is-in`) rather than sitting blank
- captions land at `opacity: 1`
- wipe and cutout reveal to `clip-path: inset(0)`
- all 7 canvases are painted (dither, wordmark, grain, resolve demo, footer
  dither, footer wordmark, footer grain)
- two screenshots 500 ms apart are byte-identical — the frame is stable

### Layout

```
node scripts/shot.mjs --url "file://$PWD/design-system.html" \
  --out docs/shots/1440-full.png --w 1440 --h 1000 --full
node scripts/shot.mjs --url "file://$PWD/design-system.html" \
  --out docs/shots/390-full.png --w 390 --h 844 --full
node scripts/shot.mjs --url "file://$PWD/design-system.html" \
  --out docs/shots/1440-dark-full.png --w 1440 --h 1000 --full --theme dark
```

| Viewport | scrollWidth | clientWidth | scrollHeight | Overflow |
| --- | --- | --- | --- | --- |
| 1440 | 1440 | 1440 | 11571 | 0 |
| 390 | 390 | 390 | 17653 | 0 |
| 1440 dark | 1440 | 1440 | 11571 | 0 |

Screenshots: `docs/shots/`.

### Marks

`node scripts/build-brand.mjs` writes and reports:

| File | Box | Note |
| --- | --- | --- |
| `brand/mark.svg` | 65 × 50 | primary; stray cell included |
| `brand/mark-compact.svg` | 30 × 30 | single glyph, no stray cell |
| `brand/wordmark.svg` | 950 × 200 | 95 columns, 760 cells, one path |
| `brand/lockup.svg` | 329 × 50 | mark + name |
| `brand/favicons/favicon-{16,32,180}.svg` | — | stamp at three sizes |

The wordmark contains no `<text>` element. It cannot fall back to a font.

### Tokens

`node scripts/build-tokens.mjs` emits `tokens/huginn.tokens.css` and
`tokens/huginn.tokens.json` from one object: 16 primitives, 16 semantic roles ×
2 themes, 10 space steps, 7 type roles, 5 durations, 3 easings. Neither output
is edited by hand; the JSON and the CSS cannot disagree because they are the same
source rendered twice.

### The component

```
/Users/adityahimawan/node_modules/.bin/tsc -p tsconfig.json
```

Compiles clean under `strict`. `components/ui/huginn-footer.tsx` renders 31
`.whf-*` classes; 22 have CSS rules and 10 are reticle geometry positioned by the
controller (each confirmed to have a reference in `lib/wild-hunt.js`). The CSS
and the controller are generated from the specimen by
`scripts/build-component.mjs`, so the page and the component cannot drift.

### Offline

The specimen loads zero network resources. Painting, riders, marks and favicons
are local files; there is no webfont, no CDN, no analytics. Open
`design-system.html` from disk with the network off and it renders completely.

---

## What the audit changed

These are the useful part of the record. Each was found by a check, not by
looking harder.

1. **Section numerals used the field colour for 12 px type.** `--accent-field`
   at 12 px measured **3.67:1** across all eleven sections. The token layer
   already said small type takes the accent role; the specimen was breaking its
   own rule. Moved to `--accent`: **6.21:1**.

2. **The footer dimmed its own captions.** Column heads at 60% opacity measured
   **2.40:1**; links at 92% measured **4.02:1**. On a field with 4.54:1 of
   headroom there is no such thing as a subtle dim. Hierarchy now comes from
   size and tracking; every footer label sits at full strength, 4.54:1.

3. **The tokens band inverted in dark mode and took three things with it.** With
   `--ink` as its ground, the band became a *light* band in the dark theme, which
   dropped its vermilion numeral to 2.68:1, its labels to 1.08:1, and its code
   panel to 1.58:1. Pinning the band to the sunken ink ground in both themes
   fixed all three at once and removed the need for an inverted palette.

4. **A group `opacity` was fading an accent with its siblings.**
   `.tokens-band .head-meta { opacity: .62 }` dimmed the numeral along with the
   eyebrow. Replaced with an alpha on the text colour only.

5. **`<code>` inside the code block rendered at 10.3 px.** The base rule shrinks
   `code` to `0.86em`; inside a block that had already set 12 px, that
   compounded. Reset to `1em`; comments lifted from 4.51:1 to 5.69:1 while there.

6. **The flourish cut through the wordmark.** The swash sat at `z-index: 5`,
   above the word at `4`, so its 5.5 px field-coloured knockout sliced channels
   through the letters. Moved behind the word and narrowed.

7. **The `hidden` attribute was being overridden.** `.field .error` sets
   `display: flex`, which beats the UA rule, so an empty error slot painted a
   lone red `!` under every field. Added `[hidden] { display: none !important }`.

8. **The theme toggle disappeared below 620 px.** It was marked optional and
   hidden — the only path to dark mode, gone on the devices most likely to be in
   someone's hand. `Copy tokens` (duplicated in the hero and the tokens band) is
   now the one that hides.

---

## What is not verified

| Gap | Why it is open |
| --- | --- |
| **Safari and Firefox rendering** | Only Chromium 1243 was available here. `color-mix()`, `container-type`, `mask-image` and `aspect-ratio` are all used; each is supported in current Safari and Firefox, but none was observed. |
| **Print** | Print rules exist (`@media print` hides the chrome and the footer, sets white ground). No proof was printed or PDF'd. |
| **Real content** | Every string is a specimen string. Line lengths, wrapping and truncation with real copy — long client names, long error messages — are untested. |
| **Iowan Old Style** | The reading face is the host's serif. On macOS it is Iowan; elsewhere Georgia. Line breaks therefore differ by platform. Deliberate (no webfont), but it means "the headline wraps like this" is only true on macOS. |
| **The component in a running app** | It typechecks and its assets are generated from the verified specimen, but it was never mounted in a Next.js app here. The first real mount is the first real test. |
| **Screen reader output** | Structure is sound (landmarks, `aria-label` on each footer column, `sr-only` word, error summary with focus management), but no screen reader session was run. |
| **Colour blindness** | The palette was not simulated under deuteranopia or protanopia. The system leans on contrast and position rather than hue for meaning, which should help, but that is reasoning, not evidence. |
| **Performance** | No budget was set or measured. The painting is 284 KB and the riders 148 KB, both local; on a slow connection they are the whole story. |
