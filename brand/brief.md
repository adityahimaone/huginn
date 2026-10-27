# Huginn — brand brief

## The one line

A studio for slow software.

## What this is

A brand kit and design system for **Huginn**, a two-city software studio
(Oslo · Reykjavík). It covers the mark, the wordmark, the field, the type
voices, the parts, the motion, the voice, and the tokens that carry all of it.
It ships as a specimen sheet you can read top to bottom, plus the generators
and the checks that prove it.

## Audience

1. **The studio's own engineers**, who need to build a page without asking a
   designer what colour a hover state is.
2. **Prospective clients**, who read the sheet as evidence of craft before they
   read a proposal.
3. **Whoever inherits this**, who needs to know which decisions were measured
   and which were taste.

## Promise

The identity depends on a drawing, not on a font. A painting becomes cells; a
name becomes cells. There is no webfont to load, no font licence to buy, and no
platform where the wordmark falls back to something else. That is the promise,
and it is also the constraint that produced the look.

## Positioning

The default for a software studio is a grotesque, a soft gradient, and a
rounded card. Huginn takes the opposite route: a nineteenth-century Norwegian
painting, a blackletter cut into a 22-row cell grid, one loud field, and four
corners that are cut rather than rounded. The reference is the printed
broadside — a poster that had to work in one colour and no resolution — not a
dashboard.

The system is deliberately narrow. One field colour, one drawing, three voices,
six parts. Narrowness is the strategy: it is what makes a two-person studio look
like it has a point of view.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Specimen | one `design-system.html`, no build step | opens over `file://`, survives a decade |
| Tokens | `scripts/build-tokens.mjs` → CSS + JSON | one source; neither file is edited by hand |
| Marks | `scripts/build-brand.mjs` → SVG | glyphs are data, so the drawing is reproducible |
| Type | system serif + system mono, blackletter drawn | no webfont, no licence, no fallback |
| Component | React client component + generated CSS | the footer ships without the specimen |
| Checks | contrast, motion, focus, screenshot scripts | claims point at files |

## Three references

1. **Peter Nicolai Arbo, *Åsgårdsreien* (The Wild Hunt of Odin), 1872.**
   Nasjonalmuseet, Oslo. Public domain. The riders, the sky, and the idea that a
   myth arrives as weather.
2. **The letterpress broadside.** Blackletter for the name, a rule for the
   hierarchy, a colophon for the honesty. Type set by hand, so nothing is
   decorative that could be structural.
3. **Ordered dithering**, as used in newsprint and the risograph. A picture
   reduced to a grid of decisions — which is the same operation as cutting a
   letter into cells.

## Deliverables

```
design-system.html                  the specimen, 11 sections, light + dark
brand/mark.svg                      65 × 50   primary mark
brand/mark-compact.svg              30 × 30   one-glyph stamp
brand/wordmark.svg                  950 × 200 outlined, 760 cells
brand/lockup.svg                    329 × 50  mark + name
brand/favicons/favicon{-16,-32,-180}.svg
brand/assets/asgardsreien-*.{jpg,webp}
tokens/huginn.tokens.{css,json}     16 primitives · 16 roles · 10 space · 7 type
components/ui/huginn-footer.tsx     the Wild Hunt footer, as a client component
components/ui/huginn-footer.css     generated from the specimen
lib/wild-hunt.js                    the drawing's geometry + controller
docs/huginn-design-system-audit.md  what is proved, and what is not
docs/shots/                         1440, 390, dark — the layout evidence
```

## Assumptions

Marked because a brief that hides its guesses is fiction.

- **ASSUMPTION** — The studio is fictional. "Huginn" is one of Odin's two
  ravens, thought; the framing "thought, sent out at dawn and back by supper" is
  built from that, not from a real client story.
- **ASSUMPTION** — Two cities, Oslo and Reykjavík, chosen to justify the
  painting's Nordic source and the bilingual `æ/ø/å` in the type specimen.
- **ASSUMPTION** — The audience values craft over velocity. If it does not, the
  system is over-built: a grotesque and a gradient would ship faster.
- **ASSUMPTION** — Nobody needs a webfont. If a future campaign needs one, the
  reading face is the only slot that should change; the wordmark never can,
  because it is a drawing.
- **NOT DECIDED** — Pricing, services copy, and the actual work index. The
  footer's column labels are placeholders shaped like real navigation.
