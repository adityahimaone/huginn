// Does the redrawn mark match the supplied bitmap? Rasterise both at the same
// size and count the disagreement, in both directions. A redraw is allowed to
// differ by a pixel of antialiasing; it is not allowed to differ by a curve.
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { CHROMIUM } from '../../scripts/chrome.mjs'

import { PRIMARY, COMPACT, hook, markBody, svg } from './geometry.mjs'

// Compare the *unpadded* primary against the supplied bitmap. COMPACT differs
// on purpose (larger stop, tighter gap), so it is measured separately.
const compact = process.argv[2] === 'compact'
const test = compact
  ? { viewBox: [0, 0, 450, 376], d: COMPACT.d, dot: COMPACT.dot }
  : { viewBox: [0, 0, 450, 376], d: hook(0, 0), dot: { cx: 381, cy: 375.6 - 69, r: 69 } }
const SRC = new URL('../brand/_source-logo-black.png', import.meta.url)
const SVG = 'data:image/svg+xml;base64,' + Buffer.from(svg({ viewBox: test.viewBox, body: markBody(test), fill: '#1B2126' })).toString('base64')

const b64 = (u) => readFileSync(u).toString('base64')
const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage()
const res = await page.evaluate(async ({ png, svg }) => {
  const W = 600, H = 501
  const load = (src) => new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src })
  const [a, b] = await Promise.all([load(png), load(svg)])
  const mask = (img) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H)
    const d = x.getImageData(0, 0, W, H).data
    const m = new Uint8Array(W * H)
    for (let i = 0; i < W * H; i++) m[i] = d[i * 4 + 3] > 127 && (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3 < 128 ? 1 : 0
    return m
  }
  const A = mask(a), B = mask(b)
  let inter = 0, uni = 0, onlyA = 0, onlyB = 0
  for (let i = 0; i < W * H; i++) {
    if (A[i] && B[i]) inter++
    if (A[i] || B[i]) uni++
    if (A[i] && !B[i]) onlyA++
    if (!A[i] && B[i]) onlyB++
  }
  return { iou: +(inter / uni).toFixed(4), onlyA, onlyB, union: uni, total: W * H }
}, { png: 'data:image/png;base64,' + b64(SRC), svg: SVG })
console.log(JSON.stringify(res, null, 1))
await browser.close()
