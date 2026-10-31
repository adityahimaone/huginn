#!/usr/bin/env python3
"""Outline a wordmark from a variable TTF.

    python3 outline-wordmark.py --font PJS.ttf --wght 800 --text JAKARTA \
        --track -0.045 --out wordmark.svg

Emits an SVG whose viewBox is the inked bounding box, plus a JSON sidecar with
the metrics the lockup builder needs (cap height, advance, ink box). No <text>
element is ever written: a font failure must not change the name.
"""
import argparse, json, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--font", required=True)
    ap.add_argument("--wght", type=float, default=800)
    ap.add_argument("--text", default="JAKARTA")
    ap.add_argument("--track", type=float, default=-0.045, help="em")
    ap.add_argument("--out", required=True)
    ap.add_argument("--metrics-out", default=None)
    a = ap.parse_args()

    f = TTFont(a.font)
    if "fvar" in f:
        f = instantiateVariableFont(f, {"wght": a.wght}, inplace=True, updateFontNames=False)

    upem = f["head"].unitsPerEm
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    hmtx = f["hmtx"]
    cap = getattr(f["OS/2"], "sCapHeight", None) or int(upem * 0.7)

    pen_x = 0.0
    parts = []
    track_units = a.track * upem
    for i, ch in enumerate(a.text):
        gname = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[gname].draw(pen)
        d = pen.getCommands()
        # font units are y-up; SVG is y-down. Flip and place on the baseline.
        if d:
            parts.append((pen_x, d))
        pen_x += hmtx[gname][0] + (track_units if i < len(a.text) - 1 else 0)

    # ink bounds
    x0 = y0 = 1e18
    x1 = y1 = -1e18
    for px, d in parts:
        bp = BoundsPen(gs)
        # re-draw to capture bounds
    # capture bounds per glyph properly
    pen_x = 0.0
    for i, ch in enumerate(a.text):
        gname = cmap[ord(ch)]
        bp = BoundsPen(gs)
        gs[gname].draw(bp)
        if bp.bounds:
            bx0, by0, bx1, by1 = bp.bounds
            x0 = min(x0, pen_x + bx0); x1 = max(x1, pen_x + bx1)
            y0 = min(y0, by0); y1 = max(y1, by1)
        pen_x += hmtx[gname][0] + (track_units if i < len(a.text) - 1 else 0)

    adv = pen_x
    # build path in y-down space, origin at ink top-left
    out = []
    for px, d in parts:
        out.append(f'<path transform="translate({px - x0:.2f} {y1:.2f}) scale(1 -1)" d="{d}"/>')
    w = x1 - x0
    h = y1 - y0
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}" '
        f'fill="currentColor" role="img" aria-label="{a.text}">'
        + "".join(out)
        + "</svg>\n"
    )
    open(a.out, "w").write(svg)

    metrics = {
        "text": a.text, "wght": a.wght, "track": a.track, "upem": upem,
        "ink": {"w": round(w, 2), "h": round(h, 2)},
        "capHeight": cap, "advance": round(adv, 2),
        "baselineFromTop": round(y1, 2),
    }
    if a.metrics_out:
        json.dump(metrics, open(a.metrics_out, "w"), indent=1)
    print(json.dumps(metrics))


if __name__ == "__main__":
    main()
