# [Brand] — brand guide

> [One sentence: what this brand is and the one idea it carries.]
> Version [1.0] · [Month Year] · Owner: [name]

## The idea

- **Audience:** [who, and the context they arrive in.]
- **Promise:** [what the brand makes possible, in their words.]
- **Positioning:** [what it is not. The nearest thing it must not look like.]
- **Metaphor:** [one sentence. The mark should be explainable from this.]
- **Direction:** “[The sentence work can be rejected against.]”

## The story

- **Belief:** [what we hold that others do not.]
- **Enemy:** [the practice this pushes against. A practice, not a competitor.]
- **The mark, as an argument:** [one sentence that does not name the shape.]
- **Why the other five lost:** [one line each.]
- **Proof:** [a number, a path or a screenshot per claim.]
- **Gap:** [what is not done or not verified.]

### Decision cards

```
Decision    [the rule]
Because     [the reason, tied to the material or the mark]
Not when    [the exception]
Breaks next [what fails first: dark mode, small size, density]
```

## The mark

[Image: mark on paper and on ink.]

- **Construction:** [grid, tile, radius, core, details, offset.]
- **Clear space:** [half the mark height. Show it.]
- **Minimum size:** [full mark; compact mark.]
- **Compact mark:** [what changes at 16–24px.]
- **Do not:** [recolour, stretch, rotate, add effects, redraw.]

## The wordmark

[Image: wordmark at 3 sizes, on paper and reversed.]

- **Source:** [type outlines / drawn alphabet.]
- **Tracking / weight:** [values.]
- **Lockups:** [horizontal, stacked.]
- **Responsive:** [name drops at X; wordmark drops at Y.]
- **Do not:** [retype, re-space, outline, add effects.]

## The cast

[Image: 4–6 cast marks, one cut line, one fill.]

- **Track:** [constructed / drawn.]
- **Cast:** [name — one-line job; four to six only.]
- **Material:** [the cut line and fill shared with the primary.]
- **Use:** [welcome, aside, celebration, energy, keep, point.]
- **Do not:** [use as structure, as the only place a fact lives, over type, or as a second logo set.]

## The marks composition

- Logo card: [stage, clear space, lockup, specs, icons, downloads, do/don't.]
- Wordmark: [large specimen, clear-space box, 40/24/16 scale.]
- Cast drawer: [4–6 tiles, uneven spans, one job per mark.]
- Usage rule: [punctuation, never structure; four to six per composition.]
- Implementation: `templates/marks-section.html`.

## Colour

| Role | Token | Hex | Use |
| --- | --- | --- | --- |
| Paper | `--[brand]-paper` | #[hex] | [the room] |
| Ink | `--[brand]-ink` | #[hex] | [type, edges] |
| Loud field | `--[brand]-[accent]` | #[hex] | [one per page] |
| Accent | `--[brand]-[accent]` | #[hex] | [marks only] |

Contrast pairs: [ink on paper 0.0:1; cream on cobalt 0.0:1.]
Rule: [one loud field at a time; accents are not body text.]

## Type

| Voice | Face | Use | Spec |
| --- | --- | --- | --- |
| Display | [face] | [one remembered thing] | [weight / tracking / leading] |
| Reading | [face] | [body] | [size / line / measure] |
| Label | [face] | [metadata] | [size / tracking] |

[One large specimen. Two short working rows. No paragraphs in the display face.]

## Icons and favicon

- Favicon: [compact mark; 16/32/48 ICO; SVG; 180 apple.]
- App: [192 / 512.]
- Checked: [16px on light and dark chrome.]
- Do not: [use the glyph without a tile; add a shadow at 16px.]

## Applications

[Images: navbar, card, sticker, social, board.]

- Navbar: [mark size, wordmark, name, gap.]
- Social: [which lockup, which crop.]
- Print: [which file, which stock.]

## Do / don't

**Do**

- [Use the supplied SVG; keep the hard offset.]
- [Use the compact mark below 24px.]
- [Keep the wordmark in ink on paper.]
- [Use the cast as punctuation; four to six per composition.]

**Don't**

- [Recolour the core / face.]
- [Stretch or re-space the lockup.]
- [Add gradients, glows, soft shadows.]
- [Place the ink wordmark on cobalt.]
- [Use the cast as structure or a second logo set.]
- [Retype the wordmark or use live text.]

## Implementation

- Track: `[constructed / drawn]`
- Mark: `[path]`
- Wordmark: `[path]`
- Lockups: `[paths]`
- Cast: `[paths; optional]`
- Marks composition: `templates/marks-section.html`
- Tokens: `[CSS / JSON paths]`
- Component: `[component path]`
- Docs page: `[route]`
- Raw Markdown: `[route]/llms.txt`

## Still open

- [Gap 1]
- [Gap 2]
- [Gap 3]

## Verification

[Link to the checklist. Name the date and the reviewer.]

## Forms

- **Theme DNA:** edge [hard/soft/none], offset [n], stroke [n], radius [n], ring [offset/solid/glow], density [compact/cosy/roomy], label [sentence/mono-caps/small-caps].
- **Field recipe:** [row from `form-theming.md`, and why it matches the mark.]
- **States:** default, hover, focus-visible, invalid, disabled, success, pressed. [Show each.]
- **Tokens:** `--field-bg`, `--field-border`, `--field-radius`, `--field-shadow`, `--field-ring`. No raw hex.
- **Do not:** [remove focus, signal with colour alone, mix material rows.]
