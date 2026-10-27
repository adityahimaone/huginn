#!/usr/bin/env node
/**
 * Screenshot a local file or URL at a given viewport and theme.
 *
 *   node scripts/shot.mjs --url file:///path/page.html --out docs/shots/a.png \
 *     --w 1440 --h 1100 [--theme dark] [--full] [--wait 1200] [--scale 2]
 *
 * Uses the Chromium already on this machine (no download). Kept small on
 * purpose: one browser, one page, one PNG.
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from 'playwright-core'
import { CHROMIUM } from './chrome.mjs'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : args[i + 1]
}

// Accept a bare path as well as a URL: `--url design-system.html` is what
// everyone types first, and file:// is what it means.
const rawUrl = flag('url')
const url = rawUrl && !/^[a-z]+:/i.test(rawUrl) ? pathToFileURL(resolve(rawUrl)).href : rawUrl
const out = resolve(flag('out', 'shot.png'))
const width = Number(flag('w', 1440))
const height = Number(flag('h', 1000))
const theme = flag('theme', '')
const full = args.includes('--full')
const wait = Number(flag('wait', 900))
const scale = Number(flag('scale', 1))
const scrollY = Number(flag('y', 0))
const selector = flag('sel', '')
const EXEC = CHROMIUM

if (!url) {
  console.error('Missing --url')
  process.exit(1)
}
mkdirSync(dirname(out), { recursive: true })

const browser = await chromium.launch(EXEC ? { executablePath: EXEC } : {})
const page = await browser.newPage({
  viewport: { width, height },
  deviceScaleFactor: scale,
  colorScheme: theme === 'dark' ? 'dark' : 'light',
})
const problems = []
page.on('console', (m) => {
  if (m.type() === 'error') problems.push(`console: ${m.text()}`)
})
page.on('pageerror', (e) => problems.push(`page: ${e.message}`))
page.on('requestfailed', (r) => problems.push(`net: ${r.url().slice(-70)} ${r.failure()?.errorText || ''}`))

await page.goto(url, { waitUntil: 'load', timeout: 30000 })
if (theme) await page.evaluate((t) => { document.documentElement.dataset.theme = t }, theme)
await page.evaluate(() => document.fonts?.ready)
if (scrollY) await page.evaluate((y) => window.scrollTo(0, y), scrollY)
if (selector) await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'start' }), selector)
await page.waitForTimeout(wait)

const metrics = await page.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  scrollH: document.documentElement.scrollHeight,
  title: document.title,
}))
await page.screenshot({ path: out, fullPage: full })
await browser.close()

console.log(JSON.stringify({ out, ...metrics, overflow: metrics.scrollW - metrics.clientW, problems }, null, 2))
