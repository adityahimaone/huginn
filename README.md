# Huginn

A brand kit and design system for a studio that ships slow software.

Open **`design-system.html`** — it is the whole thing: one file, no build step,
no network requests. Eleven sections from the foundation to the audit.

## Read in this order

| File | What it is |
| --- | --- |
| `design-system.html` | the specimen. The primary artefact. |
| `brand/brief.md` | what this is for, who it is for, what was assumed |
| `brand/DESIGN.md` | the decisions, and what they cost. Read before changing anything |
| `docs/huginn-design-system-audit.md` | what is proved, by which command, and what is not |
| `docs/INTEGRATION.md` | how to put this into a Next.js app |

## The idea

A picture becomes cells. A name becomes cells.

One operation at three scales: Arbo's *Åsgårdsreien* reduced to an ordered
dither, the wordmark cut from a 22-row cell grid, and the dissolve between them
running the same grid at a different resolution.

Nothing here is a font. The blackletter is drawn; the two text faces are the
host's own serif and mono. That is why the identity renders identically offline,
in print, and on a machine you have never seen.

## Check it

```bash
node scripts/audit-contrast.mjs --theme light   # 43 elements, 0 failures
node scripts/audit-contrast.mjs --theme dark    # 43 elements, 0 failures
node scripts/audit-motion.mjs                   # reduced motion + focus
```

## Regenerate

Generated files are never edited by hand. Edit the source, then:

```bash
node scripts/build-tokens.mjs      # tokens/*.css + *.json
node scripts/build-brand.mjs       # brand/*.svg + favicons
node scripts/inline-brand.mjs      # symbols back into design-system.html
node scripts/build-component.mjs   # lib/wild-hunt.js + components/ui/*.css
```

## Licence

The painting is public domain (Arbo, 1872, Nasjonalmuseet, via Wikimedia
Commons) — the footer colophon states this, and it should stay. The blackletter
is drawn; no typeface is embedded or required.
