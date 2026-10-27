# Huginn — the decisions

This is the file to read before changing anything. It records what was decided,
why, and what the decision costs. Where a number appears, it was measured; the
command that measured it is in `docs/huginn-design-system-audit.md`.

---

## 1. The idea

**A picture becomes cells. A name becomes cells.**

Everything follows from that sentence. The painting is reduced to an ordered
dither; the wordmark is cut from a 22-row cell grid; the dissolve between them
is the same grid at a different resolution. One operation, three scales. If a
future addition cannot be described as "cells, or the absence of cells", it does
not belong in this system.

## 2. The mark

The H is missing a cell. It sits one half-cell to the right of the stem, in the
air, still flying.

That single omission is the whole logo. It is why the mark works at 16 px — at
that size the missing cell reads as a notch, which is enough — and it is why the
mark is never redrawn, outlined, or "cleaned up".

Rules:

- The mark is drawn, never typed. `brand/mark.svg` is the file.
- Clear space is one cell on every side. The stray cell counts as part of the
  mark, so clear space starts after it.
- One colour. `currentColor`. On the field, paper white; on paper, ink.
- Below 16 px, use `mark-compact` — the single-glyph stamp, which drops the
  stray cell because at that size it becomes noise.

## 3. The wordmark

Packed glyph strings (`width:hex`), 22 rows, decoded to coordinates, run-merged
into one SVG path. 95 columns, 760 cells, 950 × 200.

Why not a blackletter font: a font is a dependency. It needs a licence, a
network, a fallback, and it will render differently on a machine you have never
seen. A drawing renders the same everywhere, including in print and in a browser
with no network.

**Never** set the wordmark as live text. Not for SEO, not for a heading, not
"just this once" in an email signature. If a context needs a name, it gets the
lockup SVG or plain serif text — never a blackletter font pretending.

## 4. The field

One loud colour, taken from the painting's own vermilion: `#E2281B`.

The field is a **display** surface. It is not a background for a page of text.
Its measured contrast against paper white is **4.54:1** — enough for body-size
type and no more. That single number governs the whole footer:

> On the field, hierarchy is carried by size and tracking, never by opacity.
> There is 4.54:1 of headroom and dimming spends it.

This is why the footer's column headings are 11 px with 0.16em tracking instead
of 60%-opacity white, and why every caption sits at full strength. An earlier
build dimmed them; the audit caught it at 2.40:1.

## 5. Colour

Five colours, all from the thing itself:

| Role | Value | Use |
| --- | --- | --- |
| Sheet | `#EBE5D8` | page ground, light |
| Chalk | `#F4EFE5` | raised ground, ink on dark |
| Ink | `#100F0E` | text, edges, dark ground |
| Field | `#E2281B` | display and fills only |
| Accent | `#A31810` | links, buttons, small type |

Plus cobalt `#1B2DB0` for the focus ring and nothing else, and moss `#2C5B45`
for confirmation. A sixth colour is a decision, not an addition.

**The one rule that keeps getting broken:** small type takes **Accent**, not
Field. The specimen itself broke this — its section numerals were 12 px field
vermilion at 3.67:1. They are now accent, at 6.21:1. If you are reaching for
`--accent-field` and the text is under 18 px, you want `--accent`.

## 6. Type

Three voices, none of them a webfont.

- **Sheet** — the drawn blackletter. The name, and only the name.
- **Reading** — the host's serif (Iowan Old Style → Georgia). Body, headings,
  anything you actually read.
- **Label** — the host's mono (JetBrains Mono → ui-monospace). Metadata, tracked
  caps, measurements.

A sans would be a fourth opinion and this system does not have room for one.

Labels never go below 12 px, except dense table headers at 11 px, and those are
tracked to compensate. A label that cannot be read is decoration with extra
steps.

## 7. Motion

**Resolution is the only big move.** Feedback is fast and quiet; the one
theatrical moment is the wordmark resolving out of eight-cell blocks down to
one, once, on entrance, ending in a still.

| Role | Token | Value |
| --- | --- | --- |
| Press | `--dur-press` | 120 ms |
| Interface | `--dur-ui` | 240 ms |
| Wipe | `--dur-wipe` | 520 ms |
| Resolve | `--dur-resolve` | 800 ms |
| Scene | `--dur-scene` | 1100 ms |

Nothing loops. Nothing moves without being asked. Under
`prefers-reduced-motion: reduce`, every sequence jumps to its finished state —
the resolved wordmark, the revealed captions, the final dither frame are all
valid stills, because no information is carried by movement alone.

## 8. Shape

`--radius: 0px`. Corners are cut, not rounded. The only circle in the system is
the reticle, and the only pill is the switch — a switch is a checkbox that had
to look like a switch.

## 9. The painting

Arbo's *Åsgårdsreien* is loaded as an image and **masked**, not sampled: a
canvas is punched with transparent holes in a Bayer pattern, so the painting
shows through the holes and the field shows through the rest. No pixel of the
artwork is ever read.

Three consequences, all good:

1. The canvas cannot be tainted, so the image can come from a CDN.
2. The dissolve still renders if the image fails to load — you get the field.
3. Provenance stays clean: the painting is decoration by construction, which is
   what its public-domain status and its role both want.

## 10. Voice

Short sentences. Concrete nouns. No adjective doing the work of a decision.

| Say | Not | Why |
| --- | --- | --- |
| Save changes | Submit | The action names the result. |
| Enter an address we can reply to. | Invalid input. | The error names the recovery. |
| No projects yet. Start one. | Nothing here. | Empty states point forward. |
| We reply within two working days. | We'll get back to you soon! | A promise with a number is a promise. |
| Thought leaves at dawn. | Unleash your creative potential. | The metaphor is in the name; the copy does not need to sell it. |

## 11. What not to do

- Do not set the wordmark as text.
- Do not use the field colour behind a paragraph.
- Do not add a sixth colour.
- Do not round a corner.
- Do not animate anything that loops.
- Do not use the cobalt for decoration — it means "keyboard focus here".
- Do not redraw the mark to remove the missing cell. That cell is the logo.
- Do not dim type on the field to create hierarchy. Use size and tracking.
- Do not read pixels from the painting. Mask it.
- Do not hand-edit `tokens/*.css`, `tokens/*.json`, `lib/wild-hunt.js`, or
  `components/ui/huginn-footer.css`. They are generated; edit the source and
  re-run the generator.

## 12. Provenance and licences

- **Painting.** Peter Nicolai Arbo, *Åsgårdsreien* (*The Wild Hunt of Odin*),
  1872. Nasjonalmuseet, Oslo. Public domain, via Wikimedia Commons. The
  colophon in the footer states this, and it should stay in the footer — it is
  the licence, not a credit line.
- **Blackletter.** Drawn. No typeface is embedded, referenced, or required.
  Nothing in this system is a font except the two system stacks.
- **Code.** The specimen, generators and component are original work for this
  project. The cell-grid technique was adapted from a supplied React component
  (`wild-hunt-footer.tsx`); the geometry here was re-derived against these
  tokens, so the two will not match line for line.
- **No third-party assets** are loaded at runtime. The specimen makes zero
  network requests: painting, riders, marks and favicons are all local files.
