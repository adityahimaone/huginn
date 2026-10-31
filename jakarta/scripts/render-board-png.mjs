// The board: 1500 × 1125, rendered at 2x. It is the thumbnail — if the board is
// wrong, nobody opens the page.
import { chromium } from 'playwright-core'
import { CHROMIUM } from '../../scripts/chrome.mjs'
import { pathToFileURL } from 'node:url'

const b = await chromium.launch({ executablePath: CHROMIUM })
const p = await b.newPage({ viewport: { width: 1500, height: 1125 }, deviceScaleFactor: 2 })
await p.goto(pathToFileURL(new URL('../src/board.html', import.meta.url).pathname.replace(/%20/g, ' ')).href)
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(600)
await p.screenshot({ path: new URL('../brand/jakarta-board.png', import.meta.url).pathname.replace(/%20/g, ' ') })
await b.close()
console.log('board ok · 3000 × 2250')
