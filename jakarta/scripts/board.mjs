#!/usr/bin/env node
/**
 * board — the design system as a scene of drawing ops, from tokens.
 *
 * Why ops and not SVG: the OpenPencil SVG importer loses glyphs from an outlined
 * path once the path sits far from the origin — at x=96 "textPrimary" is exact,
 * at x=944 it renders as "te", at every precision, with and without a transform,
 * in chunks of one path or forty. Outlined type is not a channel this runtime
 * can carry.
 *
 * So this module emits instructions (rect, line, circle, text, vector) and
 * templates/openpencil-board.js builds real nodes from them. The type becomes
 * live text with the brand's family name, which is the better answer anyway: the
 * export can be edited and restyled, not just looked at.
 *
 * Section ids follow the page, so the canvas and the site read the same way.
 */

/* ── scene primitives ────────────────────────────────────────────────────── */

const rect = (x, y, w, h, fill, opts = {}) => ({
  op: 'rect',
  x,
  y,
  w,
  h,
  fill,
  radius: opts.r || 0,
  stroke: opts.stroke || null,
  sw: opts.sw || 1,
  opacity: opts.opacity == null ? 1 : opts.opacity,
})

const line = (x1, y1, x2, y2, stroke, opacity = 1, sw = 1) => ({
  op: 'line',
  x1,
  y1,
  x2,
  y2,
  stroke,
  opacity,
  sw,
})

const circle = (cx, cy, r, fill, opacity = 1) => ({ op: 'circle', cx, cy, r, fill, opacity })

/** A placed vector: inner markup plus the intrinsic box it was drawn in. */
const vector = (x, y, w, h, inner, vb) => ({ op: 'vector', x, y, w, h, inner, vb: vb || [0, 0, w, h] })

const n = (v) => Math.round(Number(v) * 100) / 100

/* ── typography ──────────────────────────────────────────────────────────── */

function makeType(glyphApi, fonts) {
  const resolve = (voice) => fonts[voice] || fonts.reading

  /**
   * A text op. `y` is the top of the cap height — what a layout thinks in — and
   * the op carries the measurements the runtime needs to place a real text node.
   */
  function T(text, x, y, size, colour, opts = {}) {
    const voice = opts.voice || 'reading'
    const family = resolve(voice)

    /* Two channels, for one reason.
     *
     * The headless rasterizer substitutes an unknown sans or mono for Inter, so a
     * live text node still draws. It does not substitute a serif — a Georgia node
     * renders blank — and the display face is the one thing on the page that
     * cannot go missing.
     *
     * So the display voice is outlined (short chunks of real glyphs, which the
     * importer handles) and every other voice is a live text node in the brand's
     * family, which is editable and correct wherever the font is installed. */
    if (voice === 'display') {
      const m = glyphApi.chunks(family.font, text, size, { x, y, tracking: opts.tracking || 0 })
      return {
        op: 'glyphs',
        text: String(text),
        x,
        y,
        size,
        colour,
        family: family.family,
        opacity: opts.opacity == null ? 1 : opts.opacity,
        w: m.width,
        h: m.height,
        chunks: m.chunks,
      }
    }

    const m = glyphApi.outline(family.font, text, size, { x, y, tracking: opts.tracking || 0 })
    const cap = glyphApi.outline(family.font, 'H', size, { x: 0, y: 0 })
    return {
      op: 'text',
      text: String(text),
      x,
      y,
      size,
      colour,
      family: family.family,
      weight: opts.weight || 'Regular',
      tracking: opts.tracking || 0,
      opacity: opts.opacity == null ? 1 : opts.opacity,
      cap: cap.height,
      ascent: (family.font.ascender / family.font.unitsPerEm) * size,
      w: m.width,
      h: m.height,
    }
  }

  T.width = (text, size, opts = {}) => {
    const family = resolve(opts.voice || 'reading')
    return glyphApi.outline(family.font, text, size, { x: 0, y: 0, tracking: opts.tracking || 0 }).width
  }

  return T
}

/* ── shared furniture ────────────────────────────────────────────────────── */

const W = 1600
const M = 96
const CONTENT = W - M * 2

function sectionHead(T, palette, index, title, note) {
  const out = []
  out.push(line(M, 64, W - M, 64, palette.ink, 0.14))
  out.push(T(String(index).padStart(2, '0'), M, 88, 12, palette.muted, { voice: 'label', tracking: 0.14 }))
  out.push(T(title, M, 122, 56, palette.ink, { voice: 'display', tracking: -0.02 }))
  if (note) out.push(T(note, M, 196, 15, palette.muted, { voice: 'label' }))
  return out
}

function foot(T, palette, slug, label, h) {
  const y = h - 42
  const out = [line(M, y - 18, W - M, y - 18, palette.ink, 0.14)]
  out.push(T(slug.toUpperCase(), M, y, 11, palette.muted, { voice: 'label', tracking: 0.16 }))
  const w = T.width(label, 11, { voice: 'label', tracking: 0.16 })
  out.push(T(label, W - M - w, y, 11, palette.muted, { voice: 'label', tracking: 0.16 }))
  return out
}

const section = (id, name, w, h, ops, extra = {}) => ({ id, name, w, h, ops, ...extra })

/* ── sections ────────────────────────────────────────────────────────────── */

function cover(T, d, p) {
  const h = 1000
  const out = []
  out.push(line(M, 64, W - M, 64, p.ink, 0.14))
  out.push(T('DESIGN SYSTEM', M, 84, 12, p.muted, { voice: 'label', tracking: 0.18 }))
  const ed = (d.meta.version || '1.0') + ' · ' + d.meta.date
  out.push(
    T(ed, W - M - T.width(ed, 12, { voice: 'label', tracking: 0.14 }), 84, 12, p.muted, {
      voice: 'label',
      tracking: 0.14,
    })
  )

  out.push(T(d.name, M, 208, 150, p.ink, { voice: 'display', tracking: -0.035 }))
  if (d.essence) out.push(T(d.essence, M, 400, 26, p.muted, { voice: 'reading' }))

  const facts = [
    ['TRACK', d.track || '—'],
    ['MATERIAL', d.material || '—'],
    ['PRIMITIVES', String(d.colours.primitive.length)],
    ['ROLES', String(d.type.roles.length)],
    ['MARKS', String((d.assets || []).length)],
  ]
  facts.forEach(([k, v], i) => {
    const x = M + i * 210
    out.push(T(k, x, 520, 11, p.muted, { voice: 'label', tracking: 0.16 }))
    out.push(T(String(v).toUpperCase(), x, 546, 17, p.ink, { voice: 'reading' }))
  })

  const strip = d.colours.primitive.slice(0, 6)
  const gap = 8
  const cw = (CONTENT - gap * (strip.length - 1)) / Math.max(strip.length, 1)
  strip.forEach((c, i) => {
    const x = M + i * (cw + gap)
    out.push(rect(x, 660, cw, 180, c.hex, { stroke: p.ink, sw: 0.6 }))
    out.push(T(c.name.toUpperCase(), x, 856, 12, p.ink, { voice: 'label', tracking: 0.1 }))
    out.push(T(c.hex.toUpperCase(), x, 876, 12, p.muted, { voice: 'label' }))
  })

  const note = 'GENERATED FROM ' + d.slug.toUpperCase() + '-TOKENS.JSON'
  out.push(line(M, 940, W - M, 940, p.ink, 0.14))
  out.push(T(d.slug.toUpperCase(), M, 958, 11, p.muted, { voice: 'label', tracking: 0.16 }))
  out.push(
    T(note, W - M - T.width(note, 11, { voice: 'label', tracking: 0.16 }), 958, 11, p.muted, {
      voice: 'label',
      tracking: 0.16,
    })
  )

  return section('cover', '00 · Cover', W, h, out)
}

function colour(T, d, p) {
  const h = 1440
  const out = sectionHead(T, p, 2, 'Colour', 'Six inks, nine roles, two surfaces. The primitive never flips; the role does.')

  const strip = d.colours.primitive
  const gap = 8
  const cw = (CONTENT - gap * (strip.length - 1)) / Math.max(strip.length, 1)
  strip.forEach((c, i) => {
    const x = M + i * (cw + gap)
    out.push(rect(x, 250, cw, 170, c.hex, { stroke: p.ink, sw: 0.6 }))
    out.push(T(c.name.toUpperCase(), x, 434, 12, p.ink, { voice: 'label', tracking: 0.1 }))
    out.push(T(c.hex.toUpperCase(), x, 454, 12, p.muted, { voice: 'label' }))
  })

  const pairs = d.colours.semantic.light
  const colW = (CONTENT - 120) / 2
  const surfaces = [
    { label: 'LIGHT', rows: d.colours.semantic.light, x: M },
    { label: 'DARK', rows: d.colours.semantic.dark, x: M + colW + 120 },
  ]
  surfaces.forEach((s) => {
    out.push(T(s.label, s.x, 540, 11, p.muted, { voice: 'label', tracking: 0.18 }))
    out.push(line(s.x, 564, s.x + colW, 564, p.ink, 0.14))
    const rows = s.rows.length ? s.rows : pairs
    rows.forEach((r, i) => {
      const y = 584 + i * 46
      out.push(rect(s.x, y, 64, 30, r.hex, { stroke: p.ink, sw: 0.5 }))
      out.push(T(r.name, s.x + 84, y + 2, 14, p.ink, { voice: 'reading' }))
      out.push(T(r.hex.toUpperCase(), s.x + 84, y + 20, 11, p.muted, { voice: 'label' }))
      if (r.ref) {
        const w = T.width('← ' + r.ref, 11, { voice: 'label' })
        out.push(T('← ' + r.ref, s.x + colW - w - 8, y + 8, 11, p.muted, { voice: 'label' }))
      }
    })
  })

  const list = (d.contrast || []).slice(0, 9)
  const top = 1090
  out.push(line(M, top - 30, W - M, top - 30, p.ink, 0.14))
  out.push(T('CONTRAST', M, top - 16, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  out.push(T('MEASURED', M + 760, top - 16, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  list.forEach((c, i) => {
    const y = top + 26 + i * 30
    const pass = (c.ratio || 0) >= 4.5
    out.push(circle(M + 4, y + 7, 4, pass ? p.accent : p.danger))
    out.push(T(c.pair, M + 20, y, 14, p.ink, { voice: 'reading' }))
    out.push(T((c.ratio || 0).toFixed(2) + ':1', M + 760, y, 14, pass ? p.ink : p.danger, { voice: 'label' }))
    out.push(T(pass ? 'AA' : 'FAIL — large / graphic only', M + 900, y, 12, pass ? p.muted : p.danger, { voice: 'label' }))
  })

  out.push(...foot(T, p, d.slug, '02 · COLOUR', h))
  return section('colour', '01 · Colour', W, h, out)
}

function type(T, d, p) {
  const roles = d.type.roles
  const h = 300 + roles.reduce((acc, r) => acc + Math.max(r.size * 1.25, 46) + 64, 0) + 120
  const out = sectionHead(T, p, 3, 'Type', 'Sizes are the brand’s, drawn at their real pixel size — not a scaled picture of them.')

  let y = 250
  roles.forEach((r) => {
    const shown = Math.min(r.size, 120)
    out.push(line(M, y - 18, W - M, y - 18, p.ink, 0.1))
    out.push(T(r.name.toUpperCase(), M, y, 11, p.muted, { voice: 'label', tracking: 0.14 }))
    out.push(
      T(
        r.size + 'px · ' + Math.round((r.lineHeight || 1.2) * 100) + '% · ' + (r.tracking ? r.tracking + 'em' : '0'),
        M + 220,
        y,
        11,
        p.muted,
        { voice: 'label' }
      )
    )
    out.push(T(r.note || '', M + 560, y, 11, p.muted, { voice: 'label', opacity: 0.8 }))
    const voice = /label|micro|caption|mono/i.test(r.name)
      ? 'label'
      : /display|h2|h3|title/i.test(r.name)
        ? 'display'
        : 'reading'
    out.push(T(d.sample, M, y + 26, shown, p.ink, { voice, tracking: r.tracking || 0 }))
    y += Math.max(r.size * 1.25, 46) + 64
  })

  out.push(...foot(T, p, d.slug, '03 · TYPE', h))
  return section('type', '02 · Type', W, h, out)
}

function marks(T, d, p) {
  const h = 1180
  const out = sectionHead(T, p, 4, 'Marks', 'One subject, one cut line, one flat fill. The reverse cut needs a plate, not a lighter ink.')

  const assets = (d.assets || []).slice(0, 8)
  const cols = 4
  const gap = 16
  const cw = (CONTENT - gap * (cols - 1)) / cols
  const ch = 250
  assets.forEach((a, i) => {
    const x = M + (i % cols) * (cw + gap)
    const y = 250 + Math.floor(i / cols) * (ch + gap + 30)
    const reverse = /reverse/i.test(a.name)
    out.push(rect(x, y, cw, ch, reverse ? p.darkGround : p.raised, { stroke: p.ink, sw: 0.6 }))
    const box = Math.min(cw - 72, ch - 72)
    const scale = Math.min(box / a.w, box / a.h)
    const dw = a.w * scale
    const dh = a.h * scale
    out.push(vector(x + (cw - dw) / 2, y + (ch - dh) / 2, dw, dh, a.inner, a.vb || [0, 0, a.w, a.h]))
    out.push(T(a.name.toUpperCase(), x, y + ch + 8, 11, p.muted, { voice: 'label', tracking: 0.12 }))
  })

  const baseY = 250 + Math.ceil(assets.length / cols) * (ch + gap + 30) + 40
  out.push(line(M, baseY, W - M, baseY, p.ink, 0.14))
  out.push(T('CLEARSPACE', M, baseY + 24, 11, p.muted, { voice: 'label', tracking: 0.18 }))

  const x0 = M + 40
  const y0 = baseY + 70
  const m = assets[0]
  if (m) {
    const box = 120
    const scale = Math.min(box / m.w, box / m.h)
    const dw = m.w * scale
    const dh = m.h * scale
    const pad = Math.round(dh * 0.5)
    const bw = dw + pad * 2
    const bh = dh + pad * 2
    /* four rules, not a stroked rectangle: a stroke on an unfilled rect is not
     * reliable in this runtime */
    out.push(line(x0, y0, x0 + bw, y0, p.muted, 0.5))
    out.push(line(x0, y0 + bh, x0 + bw, y0 + bh, p.muted, 0.5))
    out.push(line(x0, y0, x0, y0 + bh, p.muted, 0.5))
    out.push(line(x0 + bw, y0, x0 + bw, y0 + bh, p.muted, 0.5))
    out.push(vector(x0 + pad, y0 + pad, dw, dh, m.inner, m.vb || [0, 0, m.w, m.h]))
    out.push(T('x = 0.5 × mark height, all four sides', x0, y0 + bh + 14, 12, p.muted, { voice: 'label' }))
  }

  out.push(T('MINIMUM', M + 640, baseY + 24, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  const baseLine = y0 + 120
  ;[16, 24, 34].forEach((size, i) => {
    const x = M + 640 + i * 200
    if (!m) return
    const scale = size / Math.max(m.w, m.h)
    const hh = m.h * scale
    out.push(vector(x, baseLine - hh, m.w * scale, hh, m.inner, m.vb || [0, 0, m.w, m.h]))
    out.push(T(size + 'px', x, baseLine + 16, 11, p.muted, { voice: 'label' }))
  })

  out.push(...foot(T, p, d.slug, '04 · MARKS', h))
  return section('marks', '03 · Marks', W, h, out)
}

function components(T, d, p) {
  const h = 1180
  const out = sectionHead(T, p, 5, 'Components', 'Every state is a drawing, not a screenshot. Focus is a 2px ring, never a colour swap alone.')

  const r = d.radius.find((x) => /sm|xs|default/i.test(x.name))?.px ?? d.radius[0]?.px ?? 8
  const btnH = 52
  const btnW = 168

  const button = (x, y, label, kind, state) => {
    const bg = kind === 'primary' ? p.accent : kind === 'secondary' ? p.raised : 'none'
    const ink = kind === 'primary' ? p.onAccent : p.ink
    const o = state === 'disabled' ? 0.35 : 1
    const parts = []
    parts.push(
      rect(x, y, btnW, btnH, bg, {
        r,
        stroke: kind === 'ghost' || kind === 'secondary' ? p.ink : null,
        sw: 1,
        opacity: kind === 'ghost' ? 0.35 : o,
      })
    )
    const t = T(label, 0, 0, 15, ink, { voice: 'reading', opacity: o })
    parts.push({ ...t, x: x + (btnW - t.w) / 2, y: y + (btnH - t.h) / 2 })
    return parts
  }

  const kinds = ['primary', 'secondary', 'ghost']
  const states = ['default', 'hover', 'disabled']
  out.push(T('BUTTON', M, 250, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  kinds.forEach((kind, ki) => {
    out.push(T(kind.toUpperCase(), M, 282 + ki * 96, 11, p.muted, { voice: 'label' }))
    states.forEach((state, si) => {
      out.push(...button(M + 140 + si * 196, 268 + ki * 96, 'Continue', kind, state))
    })
  })

  const input = (x, y, w, label, value, state) => {
    const parts = []
    const err = state === 'error'
    const focus = state === 'focus'
    parts.push(T(label, x, y - 24, 12, err ? p.danger : p.muted, { voice: 'label', tracking: 0.08 }))
    parts.push(
      rect(x, y, w, 52, state === 'disabled' ? p.paper : p.raised, {
        r,
        stroke: err ? p.danger : focus ? p.accent : p.ink,
        sw: focus || err ? 2 : 1,
        opacity: state === 'disabled' ? 0.5 : 1,
      })
    )
    parts.push(
      T(value, x + 16, y + 18, 15, state === 'disabled' ? p.muted : p.ink, {
        voice: 'reading',
        opacity: state === 'disabled' ? 0.6 : 1,
      })
    )
    if (err) parts.push(T('Enter a valid email address', x, y + 62, 12, p.danger, { voice: 'label' }))
    return parts
  }

  out.push(T('FIELD', M, 620, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  ;[
    ['Email', 'you@studio.com', 'default'],
    ['Email', 'you@studio.com', 'focus'],
    ['Email', 'you@studio', 'error'],
    ['Email', 'you@studio.com', 'disabled'],
  ].forEach(([label, value, state], i) => {
    out.push(...input(M + (i % 2) * 380, 690 + Math.floor(i / 2) * 130, 340, label, value, state))
  })

  out.push(T('BADGE · CARD', M + 820, 620, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  ;['NEW', 'DRAFT', 'PAID'].forEach((b, i) => {
    const x = M + 820 + i * 120
    out.push(rect(x, 690, 96, 30, i === 0 ? p.accent : 'none', { r: 15, stroke: p.ink, sw: 1 }))
    const t = T(b, 0, 0, 11, i === 0 ? p.onAccent : p.ink, { voice: 'label', tracking: 0.12 })
    out.push({ ...t, x: x + (96 - t.w) / 2, y: 690 + (30 - t.h) / 2 })
  })

  out.push(rect(M + 820, 760, 480, 230, p.raised, { r: r * 1.4, stroke: p.ink, sw: 0.8 }))
  out.push(T('The clearing', M + 848, 792, 22, p.ink, { voice: 'display' }))
  out.push(T('A card holds one idea, one action, and nothing else.', M + 848, 826, 14, p.muted, { voice: 'reading' }))
  out.push(...button(M + 848, 890, 'Open', 'primary', 'default'))

  out.push(...foot(T, p, d.slug, '05 · COMPONENTS', h))
  return section('components', '04 · Components', W, h, out)
}

function motion(T, d, p) {
  const h = 1060
  const out = sectionHead(T, p, 6, 'Motion', 'Short, and only where something moved. The still frame is the design.')

  const list = d.motion.length ? d.motion : [{ name: 'fast', px: 120 }]
  const max = Math.max(...list.map((m) => m.px))
  list.forEach((m, i) => {
    const y = 260 + i * 80
    out.push(T(m.name.toUpperCase(), M, y, 12, p.muted, { voice: 'label', tracking: 0.14 }))
    out.push(T(m.px + 'ms', M + 160, y, 12, p.ink, { voice: 'label' }))
    const w = (m.px / max) * (CONTENT - 320)
    out.push(rect(M + 280, y - 4, w, 22, p.accent))
    out.push(line(M + 280 + w, y - 12, M + 280 + w, y + 26, p.ink, 0.3))
  })

  const ease = d.ease || [0.2, 0.8, 0.2, 1]
  const ox = M + 280
  const oy = 260 + list.length * 80 + 40
  const size = 220
  out.push(rect(ox, oy, size, size, 'none', { stroke: p.ink, sw: 0.8 }))
  out.push(line(ox, oy + size, ox + size, oy + size, p.ink, 0.2))
  out.push(line(ox, oy, ox, oy + size, p.ink, 0.2))
  const bez = (t) => {
    const [x1, y1, x2, y2] = ease
    const u = 1 - t
    return [3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t, 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t]
  }
  let path = ''
  for (let i = 0; i <= 60; i++) {
    const [x, y] = bez(i / 60)
    path += (i ? 'L' : 'M') + n(x * size) + ' ' + n(size - y * size)
  }
  out.push(vector(ox, oy, size, size, `<path d="${path}" fill="none" stroke="${p.ink}" stroke-width="2"/>`, [0, 0, size, size]))
  out.push(T('cubic-bezier(' + ease.join(', ') + ')', ox, oy + size + 16, 12, p.muted, { voice: 'label' }))

  out.push(...foot(T, p, d.slug, '06 · MOTION', h))
  return section('motion', '05 · Motion', W, h, out)
}

function assets(T, d, p) {
  const h = 980
  const out = sectionHead(T, p, 7, 'Assets', 'The material the identity is printed on, and the cast that carries it.')
  const images = []

  const plate = { x: M, y: 250, w: 760, h: 420 }
  if (d.image) {
    out.push(rect(plate.x, plate.y, plate.w, plate.h, p.raised, { r: 18 }))
    images.push({ x: plate.x, y: plate.y, w: plate.w, h: plate.h, radius: 18, src: 'background' })
    out.push(rect(plate.x, plate.y, plate.w, plate.h, 'none', { r: 18, stroke: p.ink, sw: 0.8 }))
    out.push(
      T('MATERIAL — ' + (d.material || 'background').toUpperCase(), plate.x, plate.y + plate.h + 14, 11, p.muted, {
        voice: 'label',
        tracking: 0.14,
      })
    )
  }

  const cast = (d.cast || []).slice(0, 6)
  out.push(T('CAST', M + 820, 250, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  cast.forEach((c, i) => {
    const x = M + 820 + (i % 3) * 200
    const y = 286 + Math.floor(i / 3) * 200
    out.push(rect(x, y, 170, 170, p.raised, { stroke: p.ink, sw: 0.6 }))
    const scale = Math.min(96 / c.w, 96 / c.h)
    out.push(
      vector(
        x + (170 - c.w * scale) / 2,
        y + (170 - c.h * scale) / 2,
        c.w * scale,
        c.h * scale,
        c.inner,
        c.vb || [0, 0, c.w, c.h]
      )
    )
    out.push(T(c.name.toUpperCase(), x, y + 182, 11, p.muted, { voice: 'label', tracking: 0.12 }))
  })

  out.push(...foot(T, p, d.slug, '07 · ASSETS', h))
  return section('assets', '06 · Assets', W, h, out, { images })
}

function audit(T, d, p) {
  const h = 900
  const out = sectionHead(T, p, 8, 'Audit', 'The pairs that pass, and the one that does not. A palette that only publishes its passes is a brochure.')

  const list = d.contrast || []
  const failing = list.filter((c) => (c.ratio || 0) < 4.5)
  list.slice(0, 10).forEach((c, i) => {
    const y = 262 + i * 44
    const pass = (c.ratio || 0) >= 4.5
    out.push(rect(M, y - 6, 44, 30, c.bg))
    out.push(rect(M + 6, y, 32, 18, c.fg))
    out.push(T(c.pair, M + 72, y, 15, p.ink, { voice: 'reading' }))
    out.push(T((c.ratio || 0).toFixed(2) + ':1', M + 640, y, 15, pass ? p.ink : p.danger, { voice: 'label' }))
    out.push(T(pass ? 'PASS' : 'FAIL', M + 780, y, 12, pass ? p.accent : p.danger, { voice: 'label', tracking: 0.12 }))
    out.push(line(M, y + 30, M + 900, y + 30, p.ink, 0.08))
  })

  const gx = M + 980
  out.push(T('GAPS', gx, 250, 11, p.muted, { voice: 'label', tracking: 0.18 }))
  const gaps = [
    'No form kit beyond the four field states.',
    'Motion is measured; the reduced-motion still frame is not drawn.',
    'The mark at 16px is a different drawing — not shown here.',
  ]
  if (failing.length) gaps.unshift(failing[0].pair + ' is large / graphic only.')
  gaps.forEach((g, i) => {
    const y = 286 + i * 74
    out.push(T('—', gx, y, 14, p.muted, { voice: 'label' }))
    const words = String(g).split(' ')
    let buf = ''
    let row = 0
    for (const w of words) {
      const next = buf ? buf + ' ' + w : w
      if (next.length > 38 && buf) {
        out.push(T(buf, gx + 24, y + row * 22, 14, p.ink, { voice: 'reading' }))
        buf = w
        row++
      } else buf = next
    }
    if (buf) out.push(T(buf, gx + 24, y + row * 22, 14, p.ink, { voice: 'reading' }))
  })

  out.push(...foot(T, p, d.slug, '08 · AUDIT', h))
  return section('audit', '07 · Audit', W, h, out)
}

/* ── entry ───────────────────────────────────────────────────────────────── */

export function buildBoard(d, glyphApi, fonts) {
  const T = makeType(glyphApi, fonts)
  const p = d.colours
  const sections = []

  const push = (fn) => {
    try {
      sections.push(fn(T, d, p))
    } catch (e) {
      sections.push(
        section(fn.name, '99 · ' + fn.name, W, 400, [rect(M, 198, W - M * 2, 2, p.danger)], { error: e.message })
      )
    }
  }
  push(cover)
  push(colour)
  push(type)
  push(marks)
  push(components)
  push(motion)
  push(assets)
  push(audit)
  return sections
}
