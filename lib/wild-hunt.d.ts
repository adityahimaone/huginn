// Types for lib/wild-hunt.js, which is generated from design-system.html.
// Kept by hand — if the generator ever changes the public surface, this file
// is what fails first, which is the point.

export type PresetName = 'vermilion' | 'ink' | 'cobalt' | 'bone'

export interface WildHuntPalette {
  /** The field. */
  bg: string
  /** Type and marks on the field. */
  ink: string
}

export declare const PRESETS: Record<PresetName, WildHuntPalette>

export interface WildHuntOptions {
  word?: string
  preset?: PresetName
  /** Fraction of the footer height the painting occupies. */
  imageHeight?: number
  /** Fraction of the height over which the painting dissolves into the field. */
  dissolve?: number
  /** Extra cells between glyphs. */
  tracking?: number
  /** 0–1 grain opacity. */
  grain?: number
  /** Follow the pointer with the reticle. */
  interactive?: boolean
}

export declare class WildHunt {
  constructor(root: HTMLElement, options?: WildHuntOptions)
  setPreset(name: PresetName | string): void
  setWord(word: string): void
  /** Replay the entrance storyboard. */
  replay(): void
  layout(): void
  drawGrain(): void
  paint(now: number): void
  wake(): void
  play(): void
  destroy(): void
}

/* ---- the cell module: the drawing's geometry, exposed for reuse ---- */

export declare const ROWS: number
export declare const SPAN: number
export declare const GLYPHS: Record<string, string>
export declare const BAYER: number[]

export declare function decode(packed: string): { w: number; rows: string[] }
export declare function pack(rows: string[]): string
export declare function compose(
  word: string,
  glyphs: Record<string, string>,
  tracking: number,
): { cols: number; cells: number[] }
export declare function blocksOf(cells: number[], level: number): number[]
export declare function dissolveAt(yFrac: number, start: number, span: number): number
export declare function hashAt(i: number, b: number): number
export declare function coordAt(x: number, y: number, w: number, h: number): string
export declare function swashPath(W: number, H: number, over: number): string
export declare function toRgb(value: string): [number, number, number]
export declare function readColor(name: string, fallback?: string): string
export declare function reduced(): boolean
