// Huginn footer controller — generated from design-system.html by
// scripts/build-component.mjs. Do not edit by hand.
//
// The wordmark is a drawing, not a typeface: glyphs are packed cell strings
// decoded to coordinates, then painted. The painting is a *mask* — the canvas
// is punched with transparent holes, so no pixel of the artwork is ever read
// and the canvas can never taint.
/* eslint-disable */

const ROWS = 22
const SPAN = 0.28
const GLYPHS = {
  A: '15:00000000000c00fc01fc003c003c083c183c183c183c183c303c3ffc303c303c303c303c3038e03080000000',
  D: '15:00000800dfc0ffe078f878787838781878187818781878187818781878187818781078007f807f0000000000',
  E: '14:000001e007f80ff810783000700070007000700071e073e0700070007000700078007c003fe01fc00f800000',
  G: '15:000001e007f80ff8107830007000700070007000700070fc701c701c701c701c78187c003fe01fc00f800000',
  H: '15:00000000d80cf81c783c783c783c783c783c7ffc7ffc783c783c783c783c783c7038603000000000',
  I: '10:0000407c05c01c01c81c01c01c01c81c01c01c01c01c01c01c01c03f0100000',
  K: '15:00000000d81cf838787078e078e079c07b807b007f007e007f007b807bc079e078f07878703c601800000000',
  L: '14:00000000d800f800780078007800780078007800780078007800780078007800780078007fe07fc000000000',
  M: '18:00000000006ff8057dc073ce073c6073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce073ce0738e0630c04000000000',
  N: '15:00000000d80cf81c783c7c3c7c3c7e3c7e3c7f3c7b3c7bbc79fc78fc78fc787c787c783c7038603000000000',
  O: '15:0000000007f00ff8007c307c313c711c711c711c729c739c711c711c711c791c78187c103fe01fc000000000',
  R: '15:00000800dfe0fff0787878387818781878187818780078007f807fc079e078e078707878703c601800000000',
  S: '14:0000000007f00ff8107030003000300038003e001fc00ff000f8007800380018001838107fc03fc000000000',
  T: '15:000000803ffc7ff803800380038003800380038003800380038003800380038003800380038007000e000000',
  U: '15:00000000d80cf81c783c783c783c783c783c783c783c783c783c783c7c3c3c3c3e3c1ff80ff00f800000',
  V: '15:00000000d008f01870187018701870187018701870187018701878187c107e003e001f000f80070000000000',
  '&': '15:000000000f801f8031c031c030803180390038001c000e000700238023c861f070f070783ebc1f1800000000',
  '.': '4:000000000000000004f640',
  '-': '8:000000000000000000003e7c00000000000000000000',
}
const BAYER = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]

function decode(packed) {
  const i = packed.indexOf(':')
  const w = parseInt(packed.slice(0, i), 10)
  const hex = packed.slice(i + 1)
  const nd = (w + 3) >> 2
  const rows = []
  for (let r = 0; r < ROWS; r++) {
    const v = parseInt(hex.slice(r * nd, (r + 1) * nd) || '0', 16)
    let s = ''
    for (let c = 0; c < w; c++) s += (v >> (nd * 4 - 1 - c)) & 1 ? '#' : '.'
    rows.push(s)
  }
  return { w, rows }
}

function pack(rows) {
  const w = rows[0] ? rows[0].length : 0
  const nd = (w + 3) >> 2
  let hex = ''
  for (let r = 0; r < ROWS; r++) {
    let v = 0
    const row = rows[r] || ''
    for (let c = 0; c < nd * 4; c++) v = (v << 1) | (row[c] === '#' ? 1 : 0)
    hex += v.toString(16).padStart(nd, '0')
  }
  return w + ':' + hex
}

/** Lay a word out on the cell grid: total width in cells, plus lit cells. */
function compose(word, glyphs, tracking) {
  const cells = []
  let x = 0
  const gap = Math.max(0, Math.round(tracking))
  for (const ch of Array.from(String(word).toUpperCase())) {
    if (ch === ' ') {
      x += 6 + gap
      continue
    }
    const packed = glyphs[ch]
    if (!packed) continue
    const g = decode(packed)
    for (let r = 0; r < ROWS; r++) {
      const row = g.rows[r]
      for (let c = 0; c < g.w; c++) if (row[c] === '#') cells.push(x + c, r)
    }
    x += g.w + gap
  }
  return { cols: Math.max(0, x - gap), cells }
}

/** Blocks of level × level cells that contain any lit cell. */
function blocksOf(cells, level) {
  const seen = new Set()
  const out = []
  for (let i = 0; i < cells.length; i += 2) {
    const bx = Math.floor(cells[i] / level)
    const by = Math.floor(cells[i + 1] / level)
    const k = bx + ',' + by
    if (seen.has(k)) continue
    seen.add(k)
    out.push(bx, by)
  }
  return out
}

/** How much of a row is field: 0 above start, 1 from start + span down. */
function dissolveAt(yFrac, start, span) {
  const s = Math.min(0.95, Math.max(0, start))
  const w = Math.max(0.02, span)
  const t = Math.min(1, Math.max(0, (yFrac - s) / w))
  const e = t * t * (3 - 2 * t)
  return e * e * (3 - 2 * e)
}

function hashAt(i, b) {
  let h = (Math.imul(i, 374761393) + Math.imul(b, 668265263)) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Sixteen columns A–P, nine rows 1–9. The reticle's coordinate. */
function coordAt(x, y, w, h) {
  const c = Math.min(15, Math.max(0, Math.floor((x / Math.max(1, w)) * 16)))
  const r = Math.min(8, Math.max(0, Math.floor((y / Math.max(1, h)) * 9)))
  return String.fromCharCode(65 + c) + (r + 1)
}

/** The flourish, in the coordinates of a word box W × H, overshooting by over. */
function swashPath(W, H, over) {
  const o = Math.max(0, over)
  const p = (x, y) => (x * W).toFixed(1) + ' ' + (y * H).toFixed(1)
  const l = (x, y) => (x * o).toFixed(1) + ' ' + (y * H).toFixed(1)
  const r = (x, y) => (W + x * o).toFixed(1) + ' ' + (y * H).toFixed(1)
  return (
    'M ' + l(-1, 0.84) +
    ' C ' + l(-0.3, 1.08) + ' ' + l(1.1, 1.04) + ' ' + l(0.85, 0.72) +
    ' C ' + l(0.7, 0.5) + ' ' + l(-0.55, 0.44) + ' ' + l(-0.4, 0.62) +
    ' C ' + l(-0.25, 0.82) + ' ' + p(0.2, 0.92) + ' ' + p(0.42, 0.66) +
    ' C ' + p(0.58, 0.46) + ' ' + p(0.72, 0.1) + ' ' + p(0.86, 0.16) +
    ' C ' + p(0.98, 0.21) + ' ' + p(0.9, 0.44) + ' ' + p(0.8, 0.36) +
    ' C ' + p(0.73, 0.3) + ' ' + p(0.84, 0.04) + ' ' + r(0, 0.18) +
    ' C ' + r(0.85, 0.27) + ' ' + r(0.98, 0.52) + ' ' + r(0.35, 0.72)
  )
}

function toRgb(value) {
  const s = String(value).trim()
  const rgb = /^rgba?\(([^)]+)\)/.exec(s)
  if (rgb) return rgb[1].split(/[ ,/]+/).slice(0, 3).map((n) => parseFloat(n))
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s)
  if (!m) return [226, 40, 27]
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
}

// Custom properties keep their var() references, so a probe is the only
// honest way to read the colour a role actually resolves to.
let probe = null
function readColor(name, fallback) {
  if (!probe) {
    probe = document.createElement('span')
    probe.style.cssText = 'position:fixed;left:-9999px;top:0;width:0;height:0'
    document.body.appendChild(probe)
  }
  probe.style.color = ''
  probe.style.color = 'var(' + name + ')'
  const v = getComputedStyle(probe).color
  return v || fallback || 'rgb(226, 40, 27)'
}

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/* =====================================================================
   The Wild Hunt footer
   ===================================================================== */
const PRESETS = {
  vermilion: { bg: '#E2281B', ink: '#FFFDF9' },
  ink: { bg: '#100F0E', ink: '#F4EFE5' },
  cobalt: { bg: '#1B2DB0', ink: '#EEF0FF' },
  bone: { bg: '#EBE5D8', ink: '#17130F' },
}

class WildHunt {
  constructor(root, options = {}) {
    this.root = root
    this.o = Object.assign(
      { word: 'HUGINN', preset: 'vermilion', imageHeight: 0.62, dissolve: 0.4, tracking: 2, grain: 0.6, interactive: true },
      options,
    )
    this.picture = root.querySelector('.whf-picture')
    this.dither = root.querySelector('.whf-dither')
    this.word = root.querySelector('.whf-word')
    this.grain = root.querySelector('.whf-grain')
    this.marks = root.querySelector('.whf-marks')
    this.swash = root.querySelector('.whf-swash')
    this.foot = root.querySelector('.whf-foot')
    this.swashPaths = [...this.swash.querySelectorAll('path')]
    this.box = { x: 0, y: 0, w: 0, h: 0 }
    this.px = -1e5
    this.py = -1e5
    this.inside = false
    this.heat = 0
    this.heatAt = 0
    this.t0 = -1
    this.sweepAt = -1e9
    this.raf = 0
    this.visible = true
    this.alive = true
    this.fallback = {}
    this.colors = PRESETS[this.o.preset] || PRESETS.vermilion

    this.dctx = this.dither.getContext('2d')
    this.wctx = this.word.getContext('2d')
    this.gctx = this.grain.getContext('2d')

    this.onMove = this.onMove.bind(this)
    this.onLeave = this.onLeave.bind(this)
    this.onDown = this.onDown.bind(this)
    this.tick = this.tick.bind(this)

    this.applyColors()
    this.layout()
    this.drawGrain()
    this.paint(performance.now())

    root.addEventListener('pointermove', this.onMove)
    root.addEventListener('pointerleave', this.onLeave)
    root.addEventListener('pointerdown', this.onDown)

    this.ro = new ResizeObserver(() => {
      this.layout()
      this.drawGrain()
      this.wake()
    })
    this.ro.observe(root)

    this.io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        this.visible = e ? e.isIntersecting : true
        if (this.visible) {
          if (this.t0 < 0 && e && e.intersectionRatio >= 0.28) this.play()
          this.wake()
        }
      },
      { threshold: [0, 0.28, 0.6] },
    )
    this.io.observe(root)

    this.onVis = () => {
      if (!document.hidden) this.wake()
    }
    document.addEventListener('visibilitychange', this.onVis)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        if (!this.alive) return
        this.layout()
        this.drawGrain()
        this.wake()
      })
    }
  }

  applyColors() {
    this.root.style.setProperty('--whf-bg', this.colors.bg)
    this.root.style.setProperty('--whf-ink', this.colors.ink)
  }

  setPreset(name) {
    this.colors = PRESETS[name] || PRESETS.vermilion
    this.applyColors()
    this.layout()
    this.drawGrain()
    this.paint(performance.now())
  }

  setWord(word) {
    this.o.word = word || 'HUGINN'
    this.layout()
    this.play()
  }

  /** A glyph the map lacks is set in the reading face and sampled to the grid. */
  glyphFor(ch) {
    if (GLYPHS[ch]) return GLYPHS[ch]
    if (this.fallback[ch]) return this.fallback[ch]
    const c = document.createElement('canvas')
    c.width = 40
    c.height = ROWS
    const x = c.getContext('2d', { willReadFrequently: true })
    if (!x) return ''
    const fam = getComputedStyle(this.root).fontFamily || 'monospace'
    x.font = 'bold 20px ' + fam
    x.textBaseline = 'alphabetic'
    const width = Math.min(36, Math.ceil(x.measureText(ch).width))
    if (width <= 0) return ''
    x.fillStyle = '#000'
    x.fillText(ch, 1, 20)
    const d = x.getImageData(0, 0, c.width, c.height).data
    const rows = []
    for (let r = 0; r < ROWS; r++) {
      let s = ''
      for (let cx = 0; cx < width + 2; cx++) s += d[(r * c.width + cx) * 4 + 3] > 110 ? '#' : '.'
      rows.push(s)
    }
    this.fallback[ch] = pack(rows)
    return this.fallback[ch]
  }

  layout() {
    const o = this.o
    const rect = this.root.getBoundingClientRect()
    const w = Math.max(1, Math.round(rect.width))
    const h = Math.max(1, Math.round(rect.height))
    this.w = w
    this.h = h
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    const narrow = w < 720
    const pad = Math.round(Math.max(18, Math.min(48, w * 0.032)))

    const glyphs = {}
    for (const ch of Array.from(o.word.toUpperCase())) if (ch !== ' ' && !glyphs[ch]) glyphs[ch] = this.glyphFor(ch)
    const composed = compose(o.word, glyphs, o.tracking)
    this.cols = Math.max(1, composed.cols)
    this.cells = composed.cells
    this.blocks = { 8: blocksOf(this.cells, 8), 4: blocksOf(this.cells, 4), 2: blocksOf(this.cells, 2) }

    const frac = Math.min(0.8, Math.max(0.3, narrow ? Math.min(o.imageHeight, 0.5) : o.imageHeight))
    const bandH = Math.round(h * frac)
    this.bandH = bandH
    const footH = this.foot ? this.foot.offsetHeight : 0
    const redY = bandH * (Math.min(0.7, Math.max(0.1, o.dissolve)) + SPAN)
    const zoneTop = Math.round(Math.min(bandH + 8, Math.max(redY + 8, bandH - h * 0.07)))
    const zoneBottom = h - footH - 10
    const zoneH = Math.max(40, zoneBottom - zoneTop)
    const sidePad = narrow ? pad : pad + 36
    this.cell = Math.max(2, Math.floor(Math.min((w - sidePad * 2) / this.cols, (zoneH * 0.84) / ROWS)))
    const bw = this.cols * this.cell
    const bh = ROWS * this.cell
    this.box = {
      x: Math.round((w - bw) / 2),
      y: Math.round(zoneTop + (zoneH - bh) * 0.5),
      w: bw,
      h: bh,
    }

    this.picture.style.height = bandH + 'px'
    for (const el of this.root.querySelectorAll('.whf-vert')) {
      el.style.top = zoneTop + 6 + 'px'
      el.style.height = Math.max(0, zoneH - 12) + 'px'
    }

    // The dither grid is coarser than the letters, so the two scales read as one hand.
    this.pixel = Math.max(3, Math.min(6, Math.round(this.cell / 2)))
    this.dcols = Math.ceil(w / this.pixel)
    this.drows = Math.ceil(bandH / this.pixel)
    this.dither.width = this.dcols
    this.dither.height = this.drows
    this.dither.style.width = this.dcols * this.pixel + 'px'
    this.dither.style.height = this.drows * this.pixel + 'px'
    this.dimg = this.dctx.createImageData(this.dcols, this.drows)
    this.wob = new Float32Array(this.dcols)
    for (let x = 0; x < this.dcols; x++) {
      const u = x / this.dcols
      this.wob[x] =
        0.07 * Math.sin(u * 11.3 + 1.7) +
        0.045 * Math.sin(u * 29.1 + 0.4) +
        0.03 * Math.sin(u * 71 + 2.9) +
        0.02 * Math.sin(u * 163 + 0.8)
    }

    const m = 4 * this.cell
    this.m = m
    this.word.width = Math.round((bw + m * 2) * this.dpr)
    this.word.height = Math.round((bh + m * 2) * this.dpr)
    this.word.style.width = bw + m * 2 + 'px'
    this.word.style.height = bh + m * 2 + 'px'
    this.word.style.transform = 'translate(' + (this.box.x - m) + 'px,' + (this.box.y - m) + 'px)'

    this.swash.style.width = bw + 'px'
    this.swash.style.height = bh + 'px'
    this.swash.style.transform = 'translate(' + this.box.x + 'px,' + this.box.y + 'px)'
    this.swash.setAttribute('viewBox', '0 0 ' + bw + ' ' + bh)
    const over = Math.min(bw * 0.14, 110, Math.max(24, this.box.x - pad - 8))
    const d = swashPath(bw, bh, over)
    for (const p of this.swashPaths) p.setAttribute('d', d)

    this.layoutMarks()
  }

  layoutMarks() {
    const w = this.w
    const h = this.h
    const box = this.box
    const cell = this.cell
    const pad = Math.round(Math.max(18, Math.min(48, w * 0.032)))
    const q = (s) => this.marks.querySelector(s)
    const set = (el, attrs) => {
      if (!el) return
      for (const k in attrs) el.setAttribute(k, String(attrs[k]))
    }
    this.marks.setAttribute('viewBox', '0 0 ' + w + ' ' + h)
    set(q('.whf-ca'), { cx: w * 0.085, cy: h * 0.47, r: h * 0.4 })
    set(q('.whf-cb'), { cx: w * 0.87, cy: h * 0.79, r: h * 0.25 })

    const gy1 = box.y - Math.round(cell * 1.6)
    const gy2 = box.y + box.h + Math.round(cell * 1.4)
    const gl = q('.whf-gl')
    if (gl) {
      gl.setAttribute('transform', 'translate(0 ' + gy1 + ')')
      set(gl.querySelector('line'), { x1: pad, x2: Math.max(pad + 40, box.x - cell * 6), y1: 0, y2: 0 })
      set(gl.querySelector('rect'), { x: pad - 1.5, y: -1.5 })
    }
    const gr = q('.whf-gr')
    if (gr) {
      gr.setAttribute('transform', 'translate(0 ' + gy2 + ')')
      set(gr.querySelector('line'), { x1: Math.min(w - pad - 40, box.x + box.w + cell * 6), x2: w - pad, y1: 0, y2: 0 })
      set(gr.querySelector('rect'), { x: w - pad - 1.5, y: -1.5 })
    }
    const ticks = q('.whf-tick')
    if (ticks) {
      ticks.setAttribute('transform', 'translate(' + box.x + ' ' + (gy1 + 1) + ')')
      const items = [...ticks.querySelectorAll('g')]
      const step = box.w / items.length
      items.forEach((it, i) => it.setAttribute('transform', 'translate(' + Math.round(i * step) + ' 0)'))
    }
    set(q('.whf-rh'), { x1: 0, x2: w, y1: 0, y2: 0 })
    set(q('.whf-rv'), { x1: 0, x2: 0, y1: 0, y2: h })
    set(q('.whf-sl'), { x1: 0, x2: w })
  }

  drawGrain() {
    const w = this.w
    const h = this.h
    const dpr = this.dpr
    this.grain.width = Math.round(w * dpr)
    this.grain.height = Math.round(h * dpr)
    const g = this.gctx
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    if (!(this.o.grain > 0)) return
    const tile = document.createElement('canvas')
    tile.width = 160
    tile.height = 160
    const t = tile.getContext('2d')
    if (!t) return
    const id = t.createImageData(160, 160)
    for (let i = 0; i < id.data.length; i += 4) {
      const v = 80 + Math.random() * 175
      id.data[i] = id.data[i + 1] = id.data[i + 2] = v
      id.data[i + 3] = Math.random() < 0.55 ? 0 : 255
    }
    t.putImageData(id, 0, 0)
    const pattern = g.createPattern(tile, 'repeat')
    if (pattern) {
      g.globalAlpha = Math.min(1, this.o.grain) * 0.5
      g.fillStyle = pattern
      g.fillRect(0, 0, w, h)
    }
    g.globalAlpha = Math.min(1, this.o.grain) * 0.55
    g.fillStyle = '#fff'
    const n = Math.round((w * h) / 2600)
    for (let i = 0; i < n; i++) g.fillRect(Math.random() * w, Math.random() * h, 1, 1)
    g.globalAlpha = 1
  }

  drawDither(now, t) {
    const o = this.o
    const data = this.dimg.data
    const bg = toRgb(this.colors.bg)
    const start = Math.min(0.7, Math.max(0.1, o.dissolve))
    const scanY = ((t - 60) / 820) * this.drows * 1.3
    const sweep = now - this.sweepAt
    const sweepY = sweep < 760 ? (sweep / 760) * this.h : -1e4
    const R = Math.max(90, Math.min(220, this.w * 0.15))
    const hot = this.heat > 0.001 && this.inside
    let i = 0
    for (let y = 0; y < this.drows; y++) {
      const yf = (y + 0.5) / this.drows
      const base = dissolveAt(yf, start, SPAN)
      let fr = t < 0 ? 1 : Math.max(base, 1 - (() => {
        const x = (scanY - y) / (this.drows * 0.32)
        return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x)
      })())
      const yp = (y + 0.5) * this.pixel
      if (sweepY > -1e3) {
        const back = sweepY - yp
        if (back > 0 && back < 72) fr = Math.max(fr, 1 - back / 72)
      }
      for (let x = 0; x < this.dcols; x++, i += 4) {
        let f = fr
        if (t >= 0 && fr === base) f = dissolveAt(yf + this.wob[x], start, SPAN)
        if (hot) {
          const dx = (x + 0.5) * this.pixel - this.px
          const dy = yp - this.py
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < R) {
            const k = 1 - d / R
            f -= this.heat * k * k * (3 - 2 * k) * 0.98
          }
        }
        const on = (BAYER[(x & 7) | ((y & 7) << 3)] + 0.5) * 0.78 + hashAt(x + y * 4099, 0) * 14 < f * 64
        data[i] = bg[0]
        data[i + 1] = bg[1]
        data[i + 2] = bg[2]
        data[i + 3] = on ? 255 : 0
      }
    }
    this.dctx.putImageData(this.dimg, 0, 0)
  }

  drawWord(now, t) {
    const o = this.o
    const m = this.m
    const cell = this.cell
    this.wctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    this.wctx.clearRect(0, 0, this.word.width, this.word.height)
    if (t < 230) return
    this.wctx.fillStyle = this.colors.ink
    const level = t < 430 ? 8 : t < 630 ? 4 : t < 830 ? 2 : 1
    if (level > 1) {
      const b = this.blocks[level]
      for (let i = 0; i < b.length; i += 2) {
        this.wctx.fillRect(m + b[i] * level * cell, m + b[i + 1] * level * cell, level * cell, level * cell)
      }
      return
    }
    const sweep = now - this.sweepAt
    const sweepY = sweep < 760 ? (sweep / 760) * this.h - this.box.y : -1e4
    const bucket = Math.floor(now / 70)
    const R = Math.max(70, Math.min(160, this.w * 0.1))
    const hot = this.heat > 0.001 && !reduced()
    const lx = this.px - this.box.x
    const ly = this.py - this.box.y
    const blink = t < 1080 ? ((1080 - t) / 250) * 0.4 : 0
    for (let i = 0; i < this.cells.length; i += 2) {
      const cx = this.cells[i]
      const cy = this.cells[i + 1]
      const yp = (cy + 0.5) * cell
      if (sweepY > -1e3 && yp < sweepY && yp > sweepY - 90) continue
      let dx = 0
      let dy = 0
      if (hot) {
        const ddx = (cx + 0.5) * cell - lx
        const ddy = yp - ly
        const d = Math.sqrt(ddx * ddx + ddy * ddy)
        if (d < R) {
          const k = this.heat * (1 - d / R)
          const r1 = hashAt(i, bucket)
          const r2 = hashAt(i + 7919, bucket)
          if (r1 < 0.1 * k) continue
          dx = Math.round((r1 * 2 - 1) * 2.4 * k)
          dy = Math.round((r2 * 2 - 1) * 1.6 * k)
        }
      }
      if (blink > 0 && hashAt(i, bucket) < blink) continue
      if (dx || dy) {
        this.wctx.globalAlpha = 0.22
        this.wctx.fillRect(m + cx * cell, m + cy * cell, cell, cell)
        this.wctx.globalAlpha = 1
      }
      this.wctx.fillRect(m + (cx + dx) * cell, m + (cy + dy) * cell, cell, cell)
    }
    if (sweepY > -1e3) {
      const b = this.blocks[4]
      for (let i = 0; i < b.length; i += 2) {
        const yp = (b[i + 1] + 0.5) * 4 * cell
        if (yp < sweepY && yp > sweepY - 90) this.wctx.fillRect(m + b[i] * 4 * cell, m + b[i + 1] * 4 * cell, 4 * cell, 4 * cell)
      }
    }
  }

  paint(now) {
    const t = this.t0 < 0 ? -1 : reduced() ? 1e9 : Math.max(0, now - this.t0)
    const target = this.inside && this.o.interactive && !reduced() ? 1 : 0
    const dt = Math.min(0.05, (now - this.heatAt) / 1000)
    this.heatAt = now
    this.heat += (target - this.heat) * Math.min(1, dt * (target ? 9 : 6))
    if (Math.abs(target - this.heat) < 0.01) this.heat = target

    this.drawDither(now, t)
    this.drawWord(now, t)

    const sweep = now - this.sweepAt
    const sl = this.marks.querySelector('.whf-sl')
    if (sl) {
      if (sweep < 760) {
        const y = (sweep / 760) * this.h
        sl.setAttribute('y1', String(y))
        sl.setAttribute('y2', String(y))
        sl.setAttribute('opacity', String(0.9 * (1 - sweep / 760)))
      } else sl.setAttribute('opacity', '0')
    }
    this.awake = (t >= 0 && t < 1200) || this.heat > 0 || sweep < 760 || (this.inside && !reduced())
  }

  tick() {
    this.raf = 0
    if (!this.visible || !this.alive || document.hidden) return
    this.paint(performance.now())
    if (this.awake) this.raf = requestAnimationFrame(this.tick)
  }

  wake() {
    this.awake = true
    if (!this.raf && this.visible && this.alive) this.raf = requestAnimationFrame(this.tick)
  }

  play() {
    this.t0 = performance.now()
    this.root.classList.add('is-in')
    this.wake()
  }

  replay() {
    this.root.classList.remove('is-in')
    this.t0 = -1
    this.sweepAt = -1e9
    this.paint(performance.now())
    // One frame with the entrance reset, then run it again.
    requestAnimationFrame(() => {
      this.play()
    })
  }

  onMove(e) {
    if (!this.o.interactive) return
    const b = this.root.getBoundingClientRect()
    this.px = e.clientX - b.left
    this.py = e.clientY - b.top
    this.inside = true
    const ret = this.marks.querySelector('.whf-ret')
    if (ret) {
      ret.setAttribute('opacity', '1')
      this.marks.querySelector('.whf-rh').setAttribute('transform', 'translate(0 ' + this.py.toFixed(1) + ')')
      this.marks.querySelector('.whf-rv').setAttribute('transform', 'translate(' + this.px.toFixed(1) + ' 0)')
      this.marks.querySelector('.whf-rc').setAttribute('transform', 'translate(' + this.px.toFixed(1) + ' ' + this.py.toFixed(1) + ')')
      const label = this.marks.querySelector('.whf-rt')
      const right = this.px > this.w - 90
      label.setAttribute('transform', 'translate(' + (this.px + (right ? -14 : 14)).toFixed(1) + ' ' + (this.py - 10).toFixed(1) + ')')
      label.setAttribute('text-anchor', right ? 'end' : 'start')
      label.textContent =
        coordAt(this.px, this.py, this.w, this.h) +
        ' · ' + String(Math.round(this.px)).padStart(4, '0') + ',' + String(Math.round(this.py)).padStart(4, '0')
    }
    this.wake()
  }

  onLeave() {
    this.inside = false
    const ret = this.marks.querySelector('.whf-ret')
    if (ret) ret.setAttribute('opacity', '0')
    this.wake()
  }

  onDown(e) {
    if (!this.o.interactive || reduced()) return
    if (e.target.closest('a,button')) return
    this.sweepAt = performance.now()
    this.wake()
  }

  destroy() {
    this.alive = false
    cancelAnimationFrame(this.raf)
    this.ro.disconnect()
    this.io.disconnect()
    document.removeEventListener('visibilitychange', this.onVis)
    this.root.removeEventListener('pointermove', this.onMove)
    this.root.removeEventListener('pointerleave', this.onLeave)
    this.root.removeEventListener('pointerdown', this.onDown)
  }
}

export {
  ROWS,
  SPAN,
  GLYPHS,
  BAYER,
  decode,
  pack,
  compose,
  blocksOf,
  dissolveAt,
  hashAt,
  coordAt,
  swashPath,
  toRgb,
  readColor,
  reduced,
  PRESETS,
  WildHunt,
}
