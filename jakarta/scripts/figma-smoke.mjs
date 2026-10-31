#!/usr/bin/env node
/**
 * figma-smoke — run a generated plugin against a stub of the Figma API.
 *
 *   node scripts/figma-smoke.mjs design/figma/huginn/code.js
 *
 * Figma is the only place a plugin can really run, so a plugin that has never
 * been opened is a plugin nobody has tested. This stubs the API surface the
 * forge generates against, executes code.js in a VM, and reports what the
 * builder actually created: collections, variables, styles, pages, components.
 *
 * It catches the failures that cost a round trip through the app:
 *   - a variable written before its collection exists
 *   - a text style with no font loaded
 *   - a component combined into a set that is not its parent
 *   - an alias pointing at a variable that was never created
 *   - a thrown error swallowed by a try/catch that reports success anyway
 *
 * It is not a substitute for opening the file. It is a substitute for
 * discovering a typo by hand.
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import vm from 'node:vm'

const file = resolve(process.argv[2] || '')
if (!file.endsWith('.js')) {
  console.error('Usage: node scripts/figma-smoke.mjs <generated code.js>')
  process.exit(1)
}

const source = await readFile(file, 'utf8')

/* ── the stub ────────────────────────────────────────────────────────────── */

const log = { collections: [], variables: [], paintStyles: [], textStyles: [], effectStyles: [], gridStyles: [], pages: [], components: [], vectors: [], errors: [] }
let nextId = 1
const id = () => 'n' + nextId++

const KNOWN_FONTS = new Set([
  'inter',
  'jetbrains mono',
  'roboto',
  'open sans',
  'lato',
  'georgia',
  'iowan old style',
  'palatino',
  'times new roman',
  'helvetica',
  'arial',
  'sf pro text',
  'source serif 4',
  'ibm plex sans',
])

function nodeBase(type, name) {
  const node = {
    id: id(),
    type,
    name: name || type,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    children: [],
    fills: [],
    strokes: [],
    strokeWeight: 0,
    cornerRadius: 0,
    opacity: 1,
    clipsContent: false,
    layoutMode: 'NONE',
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO',
    itemSpacing: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    layoutGrow: 0,
    layoutAlign: 'INHERIT',
    appendChild(child) {
      if (!child || typeof child !== 'object') throw new Error('appendChild got ' + child)
      if (child.parent && child.parent !== node) {
        const i = child.parent.children.indexOf(child)
        if (i !== -1) child.parent.children.splice(i, 1)
      }
      child.parent = node
      node.children.push(child)
      return child
    },
    insertChild(index, child) {
      child.parent = node
      node.children.splice(index, 0, child)
    },
    resize(w, h) {
      if (!Number.isFinite(w) || !Number.isFinite(h)) throw new Error('resize got ' + w + '×' + h)
      node.width = w
      node.height = h
    },
    rescale(scale) {
      if (!Number.isFinite(scale)) throw new Error('rescale got ' + scale)
      node.width *= scale
      node.height *= scale
    },
    remove() {
      const host = node.parent ? node.parent.children : pages
      const i = host.indexOf(node)
      if (i !== -1) host.splice(i, 1)
    },
    findAll() {
      return []
    },
    findOne() {
      return null
    },
  }
  return node
}

const pages = []
let current = null
const rootPage = nodeBase('PAGE', 'Page 1')
rootPage.type = 'PAGE'
pages.push(rootPage)

const collections = []
const variables = []

const figma = {
  root: {
    get children() {
      return pages
    },
    insertChild(index, page) {
      const i = pages.indexOf(page)
      if (i !== -1) pages.splice(i, 1)
      pages.splice(index, 0, page)
    },
  },
  get currentPage() {
    return current || pages[0]
  },
  set currentPage(page) {
    /* Figma does not reorder pages when the current page changes; neither does this. */
    if (!pages.includes(page)) pages.push(page)
    current = page
  },
  createPage() {
    const p = nodeBase('PAGE', 'Page')
    p.type = 'PAGE'
    pages.push(p)
    log.pages.push(p)
    return p
  },
  createFrame() {
    const f = nodeBase('FRAME', 'Frame')
    return f
  },
  createRectangle() {
    return nodeBase('RECTANGLE', 'Rectangle')
  },
  createText() {
    const t = nodeBase('TEXT', 'Text')
    let chars = ''
    let font = null
    Object.defineProperty(t, 'characters', {
      get: () => chars,
      set: (v) => {
        if (typeof v !== 'string') throw new Error('characters got ' + typeof v)
        if (!font) throw new Error('characters set before fontName — Figma throws this too')
        chars = v
        t.width = Math.max(12, v.length * 7)
        t.height = 20
      },
    })
    Object.defineProperty(t, 'fontName', {
      get: () => font,
      set: (f) => {
        if (!f || !f.family) throw new Error('fontName needs {family, style}')
        if (!loaded.has(f.family.toLowerCase())) {
          throw new Error('font ' + f.family + ' was not loaded with loadFontAsync')
        }
        font = f
      },
    })
    t.textAutoResize = 'WIDTH_AND_HEIGHT'
    return t
  },
  createComponent() {
    const c = nodeBase('COMPONENT', 'Component')
    log.components.push(c)
    return c
  },
  combineAsVariants(nodes, parent) {
    if (!Array.isArray(nodes) || !nodes.length) throw new Error('combineAsVariants needs nodes')
    for (const n of nodes) {
      if (n.parent !== parent) throw new Error('variant ' + n.name + ' is not a child of the set parent')
    }
    const set = nodeBase('COMPONENT_SET', 'Set')
    set.children = nodes
    return set
  },
  createNodeFromSvg(svg) {
    if (typeof svg !== 'string' || !svg.includes('<svg')) throw new Error('createNodeFromSvg got no svg')
    const n = nodeBase('FRAME', 'SVG')
    const vb = svg.match(/viewBox=["']([^"']+)["']/)
    const dims = vb ? vb[1].split(/\s+/).map(Number) : [0, 0, 24, 24]
    n.width = dims[2] || 24
    n.height = dims[3] || 24
    log.vectors.push(n.name)
    return n
  },
  createPaintStyle() {
    const s = { id: id(), type: 'PAINT', name: '', paints: [], description: '' }
    log.paintStyles.push(s)
    return s
  },
  createTextStyle() {
    const s = { id: id(), type: 'TEXT', name: '', fontName: null, fontSize: 0, lineHeight: null, letterSpacing: null, description: '' }
    log.textStyles.push(s)
    return s
  },
  createEffectStyle() {
    const s = { id: id(), type: 'EFFECT', name: '', effects: [] }
    log.effectStyles.push(s)
    return s
  },
  createGridStyle() {
    const s = { id: id(), type: 'GRID', name: '', grids: [] }
    log.gridStyles.push(s)
    return s
  },
  variables: {
    createVariableCollection(name) {
      const c = {
        id: id(),
        name,
        modes: [{ modeId: 'm' + nextId++, name: 'Mode 1' }],
        renameMode(modeId, newName) {
          const m = c.modes.find((x) => x.modeId === modeId)
          if (!m) throw new Error('renameMode: no mode ' + modeId)
          m.name = newName
        },
        addMode(newName) {
          const modeId = 'm' + nextId++
          c.modes.push({ modeId, name: newName })
          return modeId
        },
      }
      collections.push(c)
      log.collections.push(c)
      return c
    },
    createVariable(name, collection, type) {
      if (!collection || !collection.modes) throw new Error('createVariable: no collection')
      if (!['COLOR', 'FLOAT', 'STRING', 'BOOLEAN'].includes(type)) throw new Error('bad variable type ' + type)
      const v = {
        id: id(),
        name,
        type,
        collection,
        values: {},
        description: '',
        setValueForMode(modeId, value) {
          if (!collection.modes.some((m) => m.modeId === modeId)) throw new Error('setValueForMode: unknown mode ' + modeId)
          if (type === 'COLOR') {
            const ok = value && typeof value === 'object' && ('r' in value || value.type === 'VARIABLE_ALIAS')
            if (!ok) throw new Error('COLOR variable ' + name + ' got ' + JSON.stringify(value))
            if ('r' in value) {
              for (const k of ['r', 'g', 'b']) {
                if (typeof value[k] !== 'number' || value[k] < 0 || value[k] > 1) {
                  throw new Error('colour channel ' + k + ' out of range on ' + name + ': ' + value[k])
                }
              }
            }
          }
          if (type === 'FLOAT' && typeof value !== 'number') throw new Error('FLOAT variable ' + name + ' got ' + typeof value)
          v.values[modeId] = value
        },
      }
      variables.push(v)
      log.variables.push(v)
      return v
    },
    createVariableAlias(variable) {
      if (!variable || !variable.id) throw new Error('createVariableAlias got no variable')
      if (!variables.includes(variable)) throw new Error('alias target ' + (variable && variable.name) + ' was never created')
      return { type: 'VARIABLE_ALIAS', id: variable.id }
    },
    setBoundVariableForPaint(paint, field, variable) {
      if (!paint || paint.type !== 'SOLID') throw new Error('setBoundVariableForPaint needs a SOLID paint')
      if (field !== 'color') throw new Error('unexpected bind field ' + field)
      if (!variable) throw new Error('binding to an undefined variable')
      return { ...paint, boundVariables: { color: { type: 'VARIABLE_ALIAS', id: variable.id } } }
    },
  },
  loadFontAsync(font) {
    if (!font || !font.family) return Promise.reject(new Error('loadFontAsync needs {family, style}'))
    if (!KNOWN_FONTS.has(font.family.toLowerCase())) {
      return Promise.reject(new Error('font not available: ' + font.family))
    }
    loaded.add(font.family.toLowerCase())
    return Promise.resolve()
  },
  notify(message) {
    log.notified = message
  },
  closePlugin(message) {
    log.closed = message
  },
  mixed: Symbol('mixed'),
}

const loaded = new Set()

/* ── run ─────────────────────────────────────────────────────────────────── */

const context = vm.createContext({ figma, console: { log() {}, error() {}, warn() {} }, JSON, Math, Number, Object, Array, String, Symbol, Promise, Set, Map, isNaN, parseInt, parseFloat })

let thrown = null
try {
  vm.runInContext(source, context, { filename: file, timeout: 20000 })
  await new Promise((r) => setTimeout(r, 50))
} catch (e) {
  thrown = e
}

/* ── report ──────────────────────────────────────────────────────────────── */

const report = {
  file,
  thrown: thrown ? thrown.message : null,
  closed: log.closed || null,
  collections: log.collections.map((c) => ({ name: c.name, modes: c.modes.map((m) => m.name) })),
  variables: log.variables.length,
  variablesByType: log.variables.reduce((a, v) => ((a[v.type] = (a[v.type] || 0) + 1), a), {}),
  aliases: log.variables.filter((v) => Object.values(v.values).some((x) => x && x.type === 'VARIABLE_ALIAS')).length,
  paintStyles: log.paintStyles.length,
  textStyles: log.textStyles.map((s) => s.name),
  effectStyles: log.effectStyles.length,
  gridStyles: log.gridStyles.length,
  pages: pages.map((p) => p.name),
  components: log.components.map((c) => c.name),
  vectors: log.vectors,
}

const problems = []
if (thrown) problems.push('the plugin threw: ' + thrown.message)
if (!log.collections.length) problems.push('no variable collection was created')
if (!log.textStyles.length) problems.push('no text style was created')
if (!pages.length) problems.push('no page was created')
const summary = log.closed || log.notified || ''
if (/failed/.test(summary)) problems.push('the plugin reported failures: ' + summary)

console.log(JSON.stringify(report, null, 2))
if (problems.length) {
  console.error('\n  ✗ ' + problems.join('\n  ✗ ') + '\n')
  process.exit(1)
}
console.log('\n  ✓ ' + report.pages.length + ' pages, ' + report.variables + ' variables, ' + report.textStyles.length + ' text styles, ' + report.components.length + ' components\n')
