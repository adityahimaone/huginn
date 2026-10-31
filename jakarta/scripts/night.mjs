import { chromium } from 'playwright-core'
import { CHROMIUM } from '../../scripts/chrome.mjs'
import { pathToFileURL } from 'node:url'
const b = await chromium.launch({ executablePath: CHROMIUM })
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } })
await p.goto(pathToFileURL('/Users/adityahimawan/WorkBuddy AI/sunnyside/jakarta/index.html').href)
await p.evaluate(() => document.fonts.ready)
await p.click('#theme-btn')
await p.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto' })
const top = await p.evaluate(() => document.getElementById('foundation').getBoundingClientRect().top + scrollY)
await p.evaluate((y) => scrollTo(0, y - 64), top)
await p.waitForTimeout(700)
await p.screenshot({ path: '/Users/adityahimawan/WorkBuddy AI/sunnyside/jakarta/docs/shots/1440-night.png' })
await b.close()
console.log('night ok')
