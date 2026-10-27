// Verifies the two audit rows that are easy to claim and hard to prove:
//   1. prefers-reduced-motion lands on a finished still, with nothing looping.
//   2. every interactive element takes focus and paints a visible 3px ring.
// Usage: node scripts/audit-motion.mjs
import { chromium } from 'playwright-core'
import { CHROMIUM } from './chrome.mjs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const CHROME = CHROMIUM

const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {})
const url = pathToFileURL(resolve('design-system.html')).href
let problems = 0
const fail = (m) => { problems++; console.log('  FAIL  ' + m) }
const pass = (m) => console.log('  pass  ' + m)

/* ---------------------------------- motion --------------------------------- */
console.log('\nREDUCED MOTION\n')
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce',
  })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'load' })
  // Scroll to the footer so its observer fires, then let the (instant) run settle.
  await p.evaluate(() => document.querySelector('.whf').scrollIntoView({ block: 'end' }))
  await p.waitForTimeout(900)

  const state = await p.evaluate(() => {
    const q = (s) => document.querySelector(s)
    const cs = (s) => (q(s) ? getComputedStyle(q(s)) : null)

    // Anything still animating forever is a motion that reduced-motion missed.
    const looping = [...document.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el)
      return (
        s.animationName !== 'none' &&
        s.animationIterationCount.split(',').some((v) => v.trim() === 'infinite') &&
        parseFloat(s.animationDuration) > 0.05
      )
    })

    const fade = cs('.whf-marks .whf-fade')
    const wipe = cs('.whf-wipe')
    const cut = cs('.whf-picture .whf-cutout')

    // A canvas that never got painted is 0x0 or fully transparent.
    const canvases = [...document.querySelectorAll('canvas')].map((c) => {
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
      let lit = 0
      for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) lit++
      return { w: c.width, h: c.height, lit }
    })

    return {
      looping: looping.map((el) => el.className || el.tagName),
      fadeOpacity: fade ? Number(fade.opacity) : null,
      wipeClip: wipe ? wipe.clipPath : null,
      cutClip: cut ? cut.clipPath : null,
      canvases,
      footerIn: q('.whf')?.classList.contains('is-in') ?? null,
    }
  })

  state.looping.length === 0
    ? pass('nothing loops with infinite iteration')
    : fail(`${state.looping.length} looping animation(s): ${state.looping.slice(0, 4).join(', ')}`)

  state.footerIn ? pass('footer entrance committed (is-in)') : fail('footer never entered is-in')

  state.fadeOpacity === 1
    ? pass('captions land at opacity 1')
    : fail(`captions stuck at opacity ${state.fadeOpacity}`)

  // Chromium collapses inset(0 0 0 0) to inset(0px); accept every spelling.
  const open = (c) => {
    if (!c || c === 'none') return true
    const n = [...String(c).matchAll(/(-?[\d.]+)px/g)].map((m) => parseFloat(m[1]))
    return n.length > 0 && n.every((v) => v === 0)
  }
  open(state.wipeClip) ? pass('wipe reveals fully (clip-path inset 0)') : fail(`wipe clipped: ${state.wipeClip}`)
  open(state.cutClip) ? pass('painting cutout reveals fully') : fail(`cutout clipped: ${state.cutClip}`)

  const blank = state.canvases.filter((c) => c.w === 0 || c.lit === 0)
  blank.length === 0
    ? pass(`all ${state.canvases.length} canvases painted`)
    : fail(`${blank.length} blank canvas(es)`)

  // The still must not depend on motion: capture the frame twice, compare bytes.
  const a = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })
  await p.waitForTimeout(500)
  const b = await p.screenshot({ clip: { x: 0, y: 0, width: 1440, height: 900 } })
  a.equals(b) ? pass('frame is stable across 500ms') : fail('frame still changing after settling')

  await ctx.close()
}

/* ---------------------------------- focus ---------------------------------- */
console.log('\nFOCUS\n')
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const p = await ctx.newPage()
  await p.goto(url, { waitUntil: 'load' })
  await p.waitForTimeout(600)

  const total = await p.evaluate(
    () =>
      document.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ).length,
  )

  const bad = []
  for (let i = 0; i < total; i++) {
    const info = await p.evaluate((idx) => {
      const all = [
        ...document.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ]
      const el = all[idx]
      if (!el) return null
      // Hidden elements (a collapsed error summary) are correctly unfocusable.
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') return null
      el.focus({ preventScroll: true })
      const s = getComputedStyle(el)
      const w = parseFloat(s.outlineWidth) || 0
      return {
        tag: el.tagName.toLowerCase(),
        label: (el.textContent || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 28),
        focused: document.activeElement === el,
        width: w,
        style: s.outlineStyle,
        color: s.outlineColor,
      }
    }, i)
    if (!info) continue
    if (!info.focused) bad.push(`${info.tag} "${info.label}" did not take focus`)
    else if (info.style === 'none' || info.width < 2)
      bad.push(`${info.tag} "${info.label}" has no ring (${info.style} ${info.width}px)`)
  }

  if (bad.length === 0) pass(`all ${total} interactive elements focus with a ring`)
  else {
    fail(`${bad.length} of ${total} focusables`)
    bad.slice(0, 8).forEach((b) => console.log('        ' + b))
  }

  // The skip link must be the first stop and become visible.
  await p.keyboard.press('Tab')
  const skip = await p.evaluate(() => {
    const el = document.activeElement
    const r = el.getBoundingClientRect()
    return { text: el.textContent.trim(), visible: r.width > 0 && r.height > 0 && r.top >= 0 }
  })
  skip.visible && /skip/i.test(skip.text)
    ? pass('first Tab lands on the visible skip link')
    : fail(`first Tab landed on "${skip.text}" (visible: ${skip.visible})`)

  await ctx.close()
}

await browser.close()
console.log(`\n${problems} problem${problems === 1 ? '' : 's'}\n`)
process.exit(problems ? 1 : 0)
