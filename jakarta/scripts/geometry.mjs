// One geometry, three drawings.
//
// Everything is derived from the stroke width (S = 100 units). The corner is 2S
// outside and 1S inside, the stop is 1.38S across, and the gap between the stop
// and the stem is 0.62S. Nothing is eyeballed: change S and the family rebuilds
// itself. That is why the mark survives at 24px and at eight metres.

export const S = 100;

// Content box, in units, before any padding.
const W = 450, H = 376;
const X_L = 150, X_R = 250;      // stem
const Y_TOP = 0;
const Y_ARM = 275.6;             // top of the arm
const Y_BOT = 375.6;             // baseline
const R_OUT = 2 * S;
const R_IN = 1 * S;

// The hook, drawn clockwise from the top-left of the stem.
// (x0, y0) is the top-left of the content box; the path is offset by it.
export function hook(x0, y0, xL = X_L, xR = X_R, yTop = Y_TOP, yArm = Y_ARM, yBot = Y_BOT) {
  const cx = xR - R_OUT, cy = yBot - R_OUT;     // shared centre of both corners
  return (
    `M${x0 + xL} ${y0 + yTop}` +
    `L${x0 + xR} ${y0 + yTop}` +
    `L${x0 + xR} ${y0 + cy}` +
    `A${R_OUT} ${R_OUT} 0 0 1 ${x0 + cx} ${y0 + yBot}` +
    `L${x0} ${y0 + yBot}` +
    `L${x0} ${y0 + yArm}` +
    `L${x0 + cx} ${y0 + yArm}` +
    `A${R_IN} ${R_IN} 0 0 0 ${x0 + xL} ${y0 + cy}` +
    `Z`
  );
}

// primary — 1S of clear space is part of the file, not an instruction.
export const PRIMARY = (() => {
  const pad = S;
  const dotR = 0.69 * S;                 // diameter 1.38S
  const dotCx = 381, dotCy = Y_BOT - dotR;
  return {
    viewBox: [0, 0, W + 2 * pad, H + 2 * pad],
    d: hook(pad, pad),
    dot: { cx: dotCx + pad, cy: dotCy + pad, r: dotR },
    ink: { x: pad, y: pad, w: W, h: H },
    pad,
  };
})();

// compact — no clear space, a larger stop set closer. A separate drawing, not a
// scale: at 16px the primary's 0.62S gap falls below 1.5 device pixels.
export const COMPACT = (() => {
  const dotR = 0.78 * S;
  const dotCx = W - dotR;                // flush to the right edge
  const dotCy = Y_BOT - dotR;
  return {
    viewBox: [0, 0, W, H],
    d: hook(0, 0),
    dot: { cx: dotCx, cy: dotCy, r: dotR },
    pad: 0,
  };
})();

// glyph — one shape. The plate carries the colour, the hook is knocked out.
// This is the drawing that is actually legible at 16px, which is the point.
export const GLYPH = (() => {
  const s = 8, pad = 4;
  const xL = 17, xR = 25, yArm = 20, yBot = 28;
  const R = 2 * s, r = 1 * s;
  const cx = xR - R, cy = yBot - R;      // 9, 12 — one centre for both corners
  const armEnd = cx - 2;                 // the arm runs 2 units past the corner
  return {
    viewBox: [0, 0, 32, 32],
    plate: { x: 0, y: 0, w: 32, h: 32 },
    d:
      `M${xL} ${pad}L${xR} ${pad}L${xR} ${cy}` +
      `A${R} ${R} 0 0 1 ${cx} ${yBot}` +
      `L${armEnd} ${yBot}L${armEnd} ${yArm}L${cx} ${yArm}` +
      `A${r} ${r} 0 0 0 ${xL} ${cy}Z`,
  };
})();

export const svg = ({ viewBox, body, fill = 'currentColor', label = 'Jakarta' }) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" viewBox="${viewBox.join(' ')}" fill="${fill}" role="img" aria-label="${label}">${body}</svg>\n`;

export const markBody = (m) =>
  `<path d="${m.d}"/><circle cx="${m.dot.cx}" cy="${m.dot.cy}" r="${m.dot.r}"/>`;
