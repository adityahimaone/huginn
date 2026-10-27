// Resolves a Chromium for playwright-core without downloading one.
//
// Order: CHROME_PATH → the playwright browser cache → the usual system install
// locations. Returns undefined if nothing is found, in which case playwright
// falls back to its own resolution (and tells you what it wanted).
//
// Override explicitly when you have several browsers:
//   CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
//     node scripts/shot.mjs --url …
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const HOME = process.env.HOME || process.env.USERPROFILE || ''

const fromCache = () => {
  const root = join(HOME, 'Library/Caches/ms-playwright')
  if (!existsSync(root)) return []
  const candidates = []
  for (const dir of readdirSync(root)) {
    if (!dir.startsWith('chromium-')) continue
    candidates.push(
      join(root, dir, 'chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      join(root, dir, 'chrome-mac/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'),
      join(root, dir, 'chrome-linux/chrome'),
      join(root, dir, 'chrome-win/chrome.exe'),
    )
  }
  // Highest revision first — the cache keeps old builds around.
  return candidates.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
}

const SYSTEM = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
]

export function resolveChromium() {
  if (process.env.CHROME_PATH) {
    if (!existsSync(process.env.CHROME_PATH)) {
      console.warn(`CHROME_PATH is set but does not exist: ${process.env.CHROME_PATH}`)
    } else {
      return process.env.CHROME_PATH
    }
  }
  for (const p of [...fromCache(), ...SYSTEM]) if (existsSync(p)) return p
  return undefined
}

export const CHROMIUM = resolveChromium()

if (!CHROMIUM && process.env.HUGINN_QUIET !== '1') {
  console.warn(
    'No Chromium found. Set CHROME_PATH, or run `npx playwright install chromium`.\n' +
      'Falling back to playwright\'s own resolution.',
  )
}
