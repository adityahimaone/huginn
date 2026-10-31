# Jakarta — design system audit

Fourteen checks. Each one is a command or a measurement, not an opinion. Three do not
pass, and one of those is the reason the palette works at all.

Re-run everything:

```bash
node jakarta/scripts/build-tokens.mjs                          # contrast, both scopes
node jakarta/scripts/verify-mark.mjs                           # redraw vs bitmap
node jakarta/scripts/verify-mark.mjs compact                   # compact, by design different
node jakarta/scripts/shots.mjs                                 # 1440, every section
node jakarta/scripts/shots.mjs --w 390                         # 390, overflow measured
node jakarta/scripts/figma-smoke.mjs design/figma/jakarta/code.js
```

## The table

| Check | Result | Evidence |
| --- | --- | --- |
| Mark redrawn, not traced | **Pass** | The supplied 6000 × 5008 bitmap and the SVG are rasterised at 600 × 501 and compared pixel by pixel: **0,989 IoU**. 768 px of surplus in the original, 473 in the redraw — all antialiasing along the arc. `scripts/verify-mark.mjs` |
| Mark at 32px | **Pass** | Hook, 2:1 corner and stop resolve on paper, on ink and on Senja. Checked at 96, 48, 32 and 24px on the real grounds. |
| Compact at 16px | **Partial** | The compact is a separate drawing — 0,78S stop, 0,44S gap, no clear space — and it holds at 16 and 24 (0,918 IoU against the primary's 0,989: the difference *is* the redesign). It keeps two shapes, so the gate's “fewer shapes than the primary” rule is **not met**. The one-shape drawing in this family is the glyph, which is what actually ships at 16px. |
| Wordmark | **Pass** | Outlined from the variable TTF at wght 800, −0,045em tracking. No `<text>` element in any file in `brand/`. |
| Contrast — light | **Partial** | 14 semantic pairs computed from the semantic layer: **8 pass, 6 fail**. See below. |
| Contrast — night | **Pass** | 14 pairs, **13 pass**. The one failure is Langit-300 as a label on Malam-100 at 4,23:1 — large text only. |
| Font registered | **Pass** | Plus Jakarta Sans, variable, wght 200–800, latin subset, 27 kB, embedded as a base64 data URI and applied to `body`. The page renders identically with the network off. |
| Reduced motion | **Pass** | Durations collapse to 0ms, the reveal state is applied immediately, image hover transforms are removed. The still frame is the finished composition. |
| 390 and 1440 | **Pass** | Single column at 390; `scrollWidth − clientWidth = 0` at both widths, measured. Rail hidden below 1320. Tables reflow to stacked rows. |
| Night scope | **Pass** | `html[data-jk="night"]` swaps the semantic layer only. All 46 primitives identical in both scopes; nothing is mode-prefixed. |
| Figma export | **Pass** | `figma-smoke.mjs` exits 0: **6 pages, 87 variables, 11 text styles, 10 components**. 87 = 46 primitives + 21 semantic + 12 space + 5 radius + 3 motion, exactly. |
| Photography brief vs assets | **Partial** | The brief assigns one supplied file to “Kota Tua heritage”. The file is a daytime skyline over kampung rooftops. It is captioned by content; the heritage slot is unfilled. |
| Print proof | **Open** | No pull on enamel or vinyl, no CMYK conversion tested. Senja at 3,24:1 is a screen measurement; on matte vinyl in afternoon sun it will be worse. |
| Audience testing | **Open** | No resident, driver or district officer has seen this. Every claim about clarity is a hypothesis. |

## The six published failures

Computed from the semantic layer, not from a swatch. Body text needs 4,5:1; large text
(24px+, or 19px bold) needs 3:1.

| Pair | Ratio | Therefore |
| --- | --- | --- |
| `accent` #F7481B on `surface` #F7F4EE | **3,24:1** | May be a rule, a band, a bullet, a 24px word. May not be 14px body copy. |
| `transit` #148BCD on surface | **3,41:1** | Same. Transit labels are set in ink with a blue dot, never in blue. |
| `alert` #F53D3F on surface | **3,40:1** | The alert *field* is red; the alert *text* is ink. |
| `park` #00A062 on surface | **3,08:1** | Passes 3:1 by 0,08. Graphics and 24px only. |
| `digital` #F194AF on surface | **1,99:1** | Surface only. Never type, at any size. |
| `heritage` #FCD260 on surface | **1,32:1** | Surface only. Not “hard to read” — invisible. |

This is the load-bearing finding of the whole system. Six of the nine district colours
cannot set small type on paper, and two cannot set type at all. The palette is the
client's and it is not going to change, so the rule is what makes it usable: **a
district colour is a ground, a mark, a field, a stripe — never a word.** Everything in
the page obeys this: pills carry their colour as a tint with ink text, audit results
are ink with a coloured stop, section labels are ink with an accent dot.

The corollary that decided the button: **white on Senja is 3,56:1 and fails**, while
**ink on Senja is 4,56:1 and passes**. So the primary button is dark-on-orange. That
is a measurement, not a taste, and it happens to look like a sign — which is the right
answer for a city.

## Named gaps

- **No citizen has seen it.** The palette is the client's; the argument is a designer's.
- **No print proof.** Enamel and vinyl behave differently from a screen.
- **No Pegon or Arabic script.** Plus Jakarta Sans covers Latin only. A Jakarta
  identity that cannot set a street name in Pegon is incomplete, and this one cannot.
- **No motion identity.** The durations exist; a signature transition does not. A
  deliberate omission, not a finished decision.
- **No accessibility review by a person who uses it.** Contrast is computed;
  wayfinding under glare, at 1,4 m, by someone with low vision, is not.
- **The `.fig` is not in the repo.** `design/figma/jakarta/openpencil.build.js` is, and
  it needs the OpenPencil CLI, which is not installed on this machine. The Figma
  plugin (`code.js` + `manifest.json`) is the working export.
- **The export ships substitute TTFs beside the real one.** The headless rasterizer
  cannot install a font, so `design/figma/jakarta/fonts/` holds Arial, Georgia and
  Andale Mono next to `PlusJakartaSans.ttf`; the plugin names the real family and will
  use it wherever Plus Jakarta Sans is installed.

## What would have to be true to ship

A physical proof of the mark at 24px on enamel, in daylight, photographed. A reading
test of the type scale at 1,4 metres. One district office rebuilding a poster from the
tokens without help. If those three pass, the system is real; until then it is a very
well-argued proposal, which is what a design system is before it meets a bus shelter.
