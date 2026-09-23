#!/usr/bin/env python3
"""Build the Android adaptive-icon foreground from the square launcher art.

Android masks an adaptive icon to its central 72dp of a 108dp canvas, and
only the inner 66dp is guaranteed visible. A full-bleed 1024px artwork used
directly as the foreground therefore loses its outer third everywhere the
mask is applied: launcher, recents, settings and the app icon shown beside a
push notification (which is where the off-centre crop was first noticed).

This script pads the art into the safe zone: the artwork is scaled to
ART_SCALE of the canvas and centred, and the bleed around it is filled with a
blurred, darkened copy of the same art so launcher zoom/parallax animations
never reveal a hard edge or the flat background colour.

Usage:
    python3 scripts/icons/make_adaptive_foreground.py SOURCE.png OUT.png
"""
import sys

from PIL import Image, ImageEnhance, ImageFilter

CANVAS_PX = 1024
# 72/108 = 0.667 of the canvas is the maximum masked region. Scaling the art
# to 0.72 keeps the whole mask covered by artwork (no bleed shows through) while
# every important element (face, cards, logo text) lands inside the safe zone.
ART_SCALE = 0.72
BLEED_BLUR_RADIUS = 40
BLEED_BRIGHTNESS = 0.55


def build_foreground(source: Image.Image) -> Image.Image:
    art = source.convert("RGBA").resize((CANVAS_PX, CANVAS_PX), Image.LANCZOS)

    bleed = art.filter(ImageFilter.GaussianBlur(BLEED_BLUR_RADIUS))
    bleed = ImageEnhance.Brightness(bleed).enhance(BLEED_BRIGHTNESS)

    inner_px = round(CANVAS_PX * ART_SCALE)
    inner = art.resize((inner_px, inner_px), Image.LANCZOS)
    offset = (CANVAS_PX - inner_px) // 2

    canvas = bleed.copy()
    canvas.alpha_composite(inner, (offset, offset))
    return canvas


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    source_path, out_path = argv[1], argv[2]
    with Image.open(source_path) as source:
        build_foreground(source).save(out_path, optimize=True)
    print(f"wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
