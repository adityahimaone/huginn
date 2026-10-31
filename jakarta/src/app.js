// Interactions only. Every string and number on the page is rendered at build
// time from the tokens; nothing here invents content.
(() => {
  const $ = (s, r = document) => r.querySelector(s)
  const $$ = (s, r = document) => [...r.querySelectorAll(s)]
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── toast ────────────────────────────────────────────────────────────────
  const toast = $('#toast'), toastText = $('#toast-text')
  let toastTimer
  const say = (msg) => {
    toastText.textContent = msg
    toast.classList.add('on')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(() => toast.classList.remove('on'), 1900)
  }

  const copy = async (text, msg) => {
    try {
      await navigator.clipboard.writeText(text)
      say(msg || `Copied ${text}`)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.append(ta); ta.select()
      document.execCommand('copy'); ta.remove()
      say(msg || `Copied ${text}`)
    }
  }

  // ── swatches ─────────────────────────────────────────────────────────────
  document.addEventListener('click', (e) => {
    const step = e.target.closest('.step')
    if (step) {
      copy(step.dataset.hex, `${step.dataset.hex} · ${step.dataset.var}`)
      return
    }
    const row = e.target.closest('.tokrow')
    if (row) copy(row.dataset.tok, `Copied ${row.dataset.tok}`)
  })

  // ── theme scope ──────────────────────────────────────────────────────────
  const themeBtn = $('#theme-btn'), themeLabel = $('#theme-label')
  const setTheme = (night) => {
    document.documentElement.dataset.jk = night ? 'night' : 'day'
    themeBtn.setAttribute('aria-pressed', String(night))
    themeLabel.textContent = night ? 'Day' : 'Night'
    themeBtn.title = night ? 'Back to the day scope' : 'Switch to the night scope'
  }
  themeBtn.addEventListener('click', () => setTheme(document.documentElement.dataset.jk !== 'night'))

  // ── copy the whole token sheet ───────────────────────────────────────────
  $('#copy-all').addEventListener('click', () => {
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    const start = css.indexOf(`:root {`)
    const end = css.indexOf(`@media (prefers-color-scheme: dark)`)
    copy(css.slice(start, end > 0 ? end : undefined).trim(), 'Token sheet copied')
  })
  $('#copy-css')?.addEventListener('click', () => {
    const css = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n')
    const start = css.indexOf(`:root {`)
    const end = css.indexOf(`@media (prefers-color-scheme: dark)`)
    copy(css.slice(start, end > 0 ? end : undefined).trim(), 'Token sheet copied')
  })

  // ── token filter ─────────────────────────────────────────────────────────
  const filter = $('#tokfilter'), count = $('#tokcount')
  const rows = $$('.tokrow')
  const applyFilter = () => {
    const q = filter.value.trim().toLowerCase()
    let shown = 0
    for (const r of rows) {
      const hit = !q || r.dataset.tok.toLowerCase().includes(q) || r.textContent.toLowerCase().includes(q)
      r.style.display = hit ? '' : 'none'
      if (hit) shown++
    }
    count.textContent = `${shown} / ${rows.length}`
  }
  filter?.addEventListener('input', applyFilter)
  if (count) count.textContent = `${rows.length} / ${rows.length}`

  // ── photo treatments ─────────────────────────────────────────────────────
  // A computed 4×4 Bayer matrix, written once as a data URL and painted over
  // the photograph. The image file is never modified.
  const bayer = (() => {
    const M = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
    const c = document.createElement('canvas')
    c.width = c.height = 4
    const x = c.getContext('2d')
    for (let y = 0; y < 4; y++) for (let i = 0; i < 4; i++) {
      const v = Math.round((M[y][i] / 16) * 255)
      x.fillStyle = `rgb(${v},${v},${v})`
      x.fillRect(i, y, 1, 1)
    }
    return c.toDataURL()
  })()
  document.documentElement.style.setProperty('--bayer', `url(${bayer})`)

  const photos = $('#photos')
  const duoBtn = $('#duo-btn'), ditherBtn = $('#dither-btn')
  duoBtn?.addEventListener('click', () => {
    const on = duoBtn.getAttribute('aria-pressed') !== 'true'
    duoBtn.setAttribute('aria-pressed', String(on))
    photos.classList.toggle('duotone', on)
    say(on ? 'Duotone · #20262C → #FF9275' : 'Full colour')
  })
  ditherBtn?.addEventListener('click', () => {
    const on = ditherBtn.getAttribute('aria-pressed') !== 'true'
    ditherBtn.setAttribute('aria-pressed', String(on))
    photos.classList.toggle('poster', on)
    say(on ? '4×4 Bayer at 22%' : 'No halftone')
  })

  // ── film grain over the hero ─────────────────────────────────────────────
  const grain = $('[data-grain]')
  if (grain && !reduce) {
    const tile = document.createElement('canvas')
    tile.width = tile.height = 128
    const tx = tile.getContext('2d')
    const img = tx.createImageData(128, 128)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 90 + Math.random() * 76
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
    tx.putImageData(img, 0, 0)
    const host = grain.parentElement
    const fit = () => {
      grain.width = Math.ceil(host.clientWidth / 2)
      grain.height = Math.ceil(host.clientHeight / 2)
      const g = grain.getContext('2d')
      const pat = g.createPattern(tile, 'repeat')
      g.fillStyle = pat
      g.fillRect(0, 0, grain.width, grain.height)
    }
    fit()
    addEventListener('resize', fit, { passive: true })
  }

  // ── the rail: fill the line, mark the current stop ───────────────────────
  const rail = document.querySelector('.rail')
  const fill = $('#rail-fill')
  const stops = $$('.rail a')
  const sections = stops.map((a) => document.getElementById(a.dataset.stop)).filter(Boolean)
  const setActive = () => {
    const y = scrollY + innerHeight * 0.34
    let active = -1
    sections.forEach((s, i) => { if (s.offsetTop <= y) active = i })
    stops.forEach((a, i) => a.setAttribute('aria-current', String(i === active)))
    if (fill && sections.length) {
      const p = Math.min(1, Math.max(0, (y - sections[0].offsetTop) / (document.body.scrollHeight - sections[0].offsetTop - innerHeight)))
      fill.style.height = `${(p * 76).toFixed(1)}%`
    }
  }
  const heroH = () => (document.querySelector('.hero')?.offsetHeight || 600)
  const toggleRail = () => rail && rail.classList.toggle('on', scrollY > heroH() * 0.55)
  addEventListener('scroll', () => { setActive(); toggleRail() }, { passive: true })
  setActive(); toggleRail()

  // ── reveal ───────────────────────────────────────────────────────────────
  const targets = $$('.sec-head, .ctx-lead, .value, .card, .ramp, .spec__row, .motif > div, .app, .photo')
  targets.forEach((el) => el.classList.add('rise'))
  if (reduce) {
    targets.forEach((el) => el.classList.add('in'))
  } else {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) }
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 })
    targets.forEach((el) => io.observe(el))
  }

  // ── keyboard: esc clears the filter ──────────────────────────────────────
  filter?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { filter.value = ''; applyFilter() }
  })
})()
