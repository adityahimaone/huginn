'use client'

/* Huginn footer — the Wild Hunt surface, as a shadcn-style client component.
 *
 * The interesting parts are not in this file: the wordmark geometry, the
 * ordered-dither mask and the entrance controller are generated from
 * design-system.html by scripts/build-component.mjs into lib/wild-hunt.js and
 * huginn-footer.css. This file owns the markup and the lifecycle, so there is
 * exactly one implementation of the drawing.
 *
 * What it does NOT do: read pixels from the painting. The canvas is punched
 * with transparent holes, so the artwork can be cross-origin, cached, or
 * missing and the dissolve still renders. That is what keeps the footer
 * shippable on a CDN.
 */

import * as React from 'react'
import { WildHunt, PRESETS, type PresetName } from '@/lib/wild-hunt'
import './huginn-footer.css'

export interface HuginnColumn {
  heading: string
  links: Array<{ label: string; href: string }>
}

export interface HuginnFooterProps extends React.HTMLAttributes<HTMLElement> {
  /** The name drawn in cells. Falls back to HUGINN; anything outside the
   *  glyph set is skipped rather than substituted. */
  word?: string
  /** Field colour. `vermilion` is the canonical poster; the rest are proofs. */
  preset?: PresetName
  /** The painting. Serve it same-origin or from a CDN — no CORS needed. */
  imageSrc?: string
  /** The riders, with alpha, sitting above the dissolve. Optional. */
  cutoutSrc?: string
  /** Any CSS length. The default keeps the footer under one viewport. */
  height?: string
  /** Marginalia, rotated into the left and right edges. */
  marginaliaLeft?: string
  marginaliaRight?: string
  columns?: HuginnColumn[]
  /** Legal line under the columns. Keep the provenance — it is the licence. */
  colophon?: string
  copyright?: string
  onBackToTop?: () => void
}

const DEFAULT_COLUMNS: HuginnColumn[] = [
  {
    heading: 'Work',
    links: [
      { label: 'Index', href: '/work' },
      { label: 'Archive', href: '/archive' },
      { label: 'Journal', href: '/journal' },
    ],
  },
  {
    heading: 'Studio',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Process', href: '/process' },
      { label: 'Careers', href: '/careers' },
    ],
  },
  {
    heading: 'Elsewhere',
    links: [
      { label: 'Instagram', href: 'https://instagram.com' },
      { label: 'Are.na', href: 'https://are.na' },
      { label: 'GitHub', href: 'https://github.com' },
    ],
  },
  {
    heading: 'Contact',
    links: [
      { label: 'hello@huginn.studio', href: 'mailto:hello@huginn.studio' },
      { label: '+47 22 00 41 00', href: 'tel:+4722004100' },
    ],
  },
]

const COLOPHON =
  'Painting: Peter Nicolai Arbo, Åsgårdsreien (The Wild Hunt of Odin), 1872. ' +
  'Nasjonalmuseet, Oslo. Public domain, via Wikimedia Commons. The blackletter ' +
  'is drawn in cells; nothing on this sheet is a font.'

/** Twelve rays, drawn — the studio's seal. Static markup, so it costs nothing. */
function Sigil() {
  return (
    <svg viewBox="-8 -8 16 16" aria-hidden="true">
      <g>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <line
              key={i}
              x1={(Math.cos(a) * 2.2).toFixed(2)}
              y1={(Math.sin(a) * 2.2).toFixed(2)}
              x2={(Math.cos(a) * 7).toFixed(2)}
              y2={(Math.sin(a) * 7).toFixed(2)}
            />
          )
        })}
      </g>
    </svg>
  )
}

export function HuginnFooter({
  word = 'HUGINN',
  preset = 'vermilion',
  imageSrc = '/brand/assets/asgardsreien-1872.jpg',
  cutoutSrc = '/brand/assets/asgardsreien-riders.webp',
  height = 'min(92svh, 780px)',
  marginaliaLeft = 'Thought flies out at dawn · over the whole of the world · and is back by supper',
  marginaliaRight = 'Founded 2019 · Oslo & Reykjavík · a studio for slow software',
  columns = DEFAULT_COLUMNS,
  colophon = COLOPHON,
  copyright = '© 2026 Huginn Studio',
  onBackToTop,
  className,
  ...rest
}: HuginnFooterProps) {
  const rootRef = React.useRef<HTMLElement>(null)
  const huntRef = React.useRef<WildHunt | null>(null)

  // The controller is imperative on purpose: it owns a canvas, a ResizeObserver
  // and a pointer loop. Re-rendering React for any of that would be waste.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const hunt = new WildHunt(root, { word, preset })
    huntRef.current = hunt
    return () => {
      hunt.destroy?.()
      huntRef.current = null
    }
    // Mount once. Changing the word or preset is an explicit call below, not a
    // remount — the entrance should not replay because a prop changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    huntRef.current?.setWord?.(word)
  }, [word])

  React.useEffect(() => {
    huntRef.current?.setPreset?.(preset)
  }, [preset])

  const backToTop = React.useCallback(() => {
    if (onBackToTop) return onBackToTop()
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  }, [onBackToTop])

  return (
    <footer
      ref={rootRef}
      aria-label="Huginn studio footer"
      className={className ? `whf ${className}` : 'whf'}
      style={{ height }}
      {...rest}
    >
      <div className="whf-picture" aria-hidden="true">
        <img src={imageSrc} alt="" draggable={false} style={{ objectPosition: '50% 26%' }} />
        <div className="whf-tint" />
        <canvas className="whf-dither" />
        {cutoutSrc ? (
          <img className="whf-cutout" src={cutoutSrc} alt="" draggable={false} style={{ objectPosition: '50% 26%' }} />
        ) : null}
      </div>

      <canvas className="whf-grain" aria-hidden="true" />

      <svg
        className="whf-marks"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      >
        <circle className="whf-ca whf-fade" strokeDasharray="1.5 5" opacity={0.55} style={{ '--d': '.2s' } as React.CSSProperties} />
        <circle className="whf-cb whf-fade" strokeDasharray="1.5 5" opacity={0.55} style={{ '--d': '.5s' } as React.CSSProperties} />
        <g className="whf-gl whf-fade" style={{ '--d': '.7s' } as React.CSSProperties}>
          <line strokeDasharray="1 3" />
          <rect width="3" height="3" fill="currentColor" stroke="none" />
        </g>
        <g className="whf-gr whf-fade" style={{ '--d': '.9s' } as React.CSSProperties}>
          <line strokeDasharray="1 3" />
          <rect width="3" height="3" fill="currentColor" stroke="none" />
        </g>
        <g className="whf-tick whf-fade" style={{ '--d': '1.1s' } as React.CSSProperties}>
          {['A1', 'B2', 'C3', 'D4', 'E5', 'F6'].map((label) => (
            <g key={label}>
              <line x1="0" y1="-4" x2="0" y2="0" />
              <text x="5" y="-1">
                {label}
              </text>
            </g>
          ))}
        </g>
        <line className="whf-sl" opacity={0} />
        <g className="whf-ret" opacity={0}>
          <line className="whf-rh" strokeDasharray="1 3" opacity={0.6} />
          <line className="whf-rv" strokeDasharray="1 3" opacity={0.6} />
          <g className="whf-rc">
            <circle r="7" />
            <line x1="-11" x2="-7" />
            <line x1="7" x2="11" />
            <line y1="-11" y2="-7" />
            <line y1="7" y2="11" />
          </g>
          <text className="whf-rt" />
        </g>
      </svg>

      <canvas className="whf-word" aria-hidden="true" />

      <svg className="whf-swash" aria-hidden="true">
        <path className="whf-cut" pathLength={1} />
        <path className="whf-pen" pathLength={1} transform="translate(1.6 -1.6)" />
        <path className="whf-pen" pathLength={1} transform="translate(0.8 -0.8)" />
        <path className="whf-pen" pathLength={1} />
      </svg>

      {/* The canvas is decoration; this is the word a screen reader gets. */}
      <span className="sr-only">{word}</span>

      <p className="whf-vert whf-l whf-wipe" style={{ '--d': '.6s' } as React.CSSProperties}>
        <span>{marginaliaLeft}</span>
      </p>
      <p className="whf-vert whf-r whf-wipe" style={{ '--d': '.8s' } as React.CSSProperties}>
        <span>{marginaliaRight}</span>
      </p>

      <div className="whf-foot">
        {columns.map((col, i) => (
          <nav
            key={col.heading}
            className="whf-col whf-wipe"
            aria-label={col.heading}
            style={{ '--d': `${0.5 + i * 0.08}s` } as React.CSSProperties}
          >
            <h3>{col.heading}</h3>
            <ul>
              {col.links.map((link) => (
                <li key={link.href + link.label}>
                  <a href={link.href}>{link.label}</a>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <button
          className="whf-up whf-wipe"
          type="button"
          onClick={backToTop}
          style={{ '--d': '.9s' } as React.CSSProperties}
        >
          Back to top
        </button>

        <div className="whf-legal whf-wipe" style={{ '--d': '1s' } as React.CSSProperties}>
          <div className="whf-sig">
            <Sigil />
            <svg viewBox="-8 -8 16 16" aria-hidden="true">
              <circle r="6.8" strokeDasharray="1 2.2" />
              <path d="M 0 -4.6 A 4.6 4.6 0 1 1 -4.6 0 A 2.6 2.6 0 1 0 0 -2.6 A 1.2 1.2 0 1 1 -1.2 0" />
            </svg>
            <span>{copyright}</span>
          </div>
          <p>{colophon}</p>
        </div>
      </div>
    </footer>
  )
}

export { PRESETS }
export type { PresetName }
export default HuginnFooter
