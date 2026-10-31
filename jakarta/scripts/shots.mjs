// Section and full-page screenshots. Scrolls instantly — a smooth scroll over
// seventeen thousand pixels is still animating when the shutter fires, which is
// how a section shot ends up showing the section before it.
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { CHROMIUM } from '../../scripts/chrome.mjs'

const args = process.argv.slice(2)
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i === -1 ? d : args[i + 1] }
const url = pathToFileURL(resolve(flag('url', 'jakarta/index.html'))).href
const outDir = resolve(flag('out', 'jakarta/docs/shots'))
const width = Number(flag('w', 1440))
const only = flag('only', '')
mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ executablePath: CHROMIUM })
const page = await browser.newPage({ viewport: { width, height: 1000 }, deviceScaleFactor: Number(flag('scale', 1)) })
const problems = []
page.on('pageerror', (e) => problems.push(`page: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`) })
page.on('requestfailed', (r) => problems.push(`net: ${r.url().slice(-60)}`))

await page.goto(url, { waitUntil: 'load' })
await page.evaluate(() => document.fonts.ready)
await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
await page.waitForTimeout(500)

const ids = ['context', 'strategy', 'foundation', 'mark', 'photo', 'apps', 'tokens', 'audit']
for (const id of ids) {
  if (only && only !== id) continue
  const top = await page.evaluate((i) => {
    const el = document.getElementById(i)
    return el.getBoundingClientRect().top + window.scrollY
  }, id)
  await page.evaluate((y) => window.scrollTo(0, y - 64), top)
  await page.waitForTimeout(700)
  await page.screenshot({ path: `${outDir}/${width}-${id}.png` })
}

await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(300)
await page.screenshot({ path: `${outDir}/${width}-hero.png` })
if (!only) await page.screenshot({ path: `${outDir}/${width}-full.png`, fullPage: true })

const m = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth, h: document.documentElement.scrollHeight }))
await browser.close()
console.log(JSON.stringify({ ...m, overflow: m.scrollW - m.clientW, problems }, null, 1))
