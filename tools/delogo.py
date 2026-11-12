"""Find and erase logos in app screenshots.

Two kinds of removal:

  1. A light wordmark on a dark, gradient header bar (header_band +
     find_mark + erase). erase() interpolates each row between the pixel
     just left of the box and the pixel just right, so a horizontal
     gradient carries straight through and the patch is invisible.

  2. Anything on a plain light background — a logo chip, a person's name
     (blank). Fills flat from the strip directly ABOVE the box; filling
     across instead smears things like the underline under a linked name.

ALWAYS PREVIEW BEFORE PAINTING: draw outline() boxes on a copy, look at
it, then erase. Detection has over-matched ordinary table content before.

    import img, delogo
    a = img.load("screen.png")
    band = delogo.header_band(a)
    box = delogo.find_mark(a, band)        # (x0, y0, x1, y1) or None
    preview = a.copy(); delogo.outline(preview, box); img.save("check.png", preview)
    delogo.erase(a, box); img.save("screen.png", a)
"""
import numpy as np


def header_band(a, look=170, maxband=120):
    """The dark bar across the top. Relative threshold, because a screenshot
    dimmed behind a modal has very little contrast."""
    left = a[:look, :max(40, a.shape[1] // 3)].astype(np.float64).mean(axis=(1, 2))
    lo, hi = left.min(), left.max()
    if hi - lo < 14:
        return None
    thr = lo + (hi - lo) * 0.42
    dark = left < thr
    y = 0
    while y < len(dark) and not dark[y]:
        y += 1
    if y > 40:
        return None
    y1 = y
    while y1 < len(dark) and dark[y1]:
        y1 += 1
    y1 = min(y1, y + maxband)
    return (y, y1) if y1 - y >= 18 else None


def find_mark(a, band, reach=6.0, gap=14):
    """Bounding box of the leftmost light blob in the bar. Only the
    leftmost: the thin divider further along is also lighter than the bar."""
    y0, y1 = band
    xmax = min(a.shape[1], int((y1 - y0) * reach))
    reg = a[y0:y1, :xmax].astype(np.int16)
    bg = np.median(reg.reshape(-1, 3), axis=0)
    m = reg.mean(axis=2) > bg.mean() + 26        # strictly lighter, not just different
    m[:3] = False; m[-3:] = False; m[:, :4] = False
    cols = np.where(m.any(axis=0))[0]
    if len(cols) < 8:
        return None
    x0 = cols[0]; x1 = x0
    for c in cols:
        if c - x1 > gap:
            break
        x1 = c
    rows = np.where(m[:, x0:x1 + 1].any(axis=1))[0]
    return int(x0), int(y0 + rows.min()), int(x1) + 1, int(y0 + rows.max()) + 1


def erase(a, box, pad=6):
    """Fill by interpolating each row between the pixels either side."""
    x0, y0, x1, y1 = box
    H, W = a.shape[:2]
    x0 = max(1, x0 - pad); y0 = max(0, y0 - pad)
    x1 = min(W - 1, x1 + pad); y1 = min(H, y1 + pad)
    left = a[y0:y1, x0 - 1].astype(np.float64)
    right = a[y0:y1, x1].astype(np.float64)
    t = np.linspace(0, 1, (x1 - x0) + 2)[1:-1][None, :, None]
    a[y0:y1, x0:x1] = (left[:, None, :] * (1 - t) + right[:, None, :] * t).round().astype(np.uint8)
    return (x0, y0, x1, y1)


def blank(a, box, pad=4):
    """Flat fill from the strip just above the box — for plain backgrounds."""
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    strip = a[max(0, y0 - 9):max(1, y0 - 2), x0:x1].reshape(-1, 3)
    a[y0:y1, x0:x1] = np.median(strip, axis=0).round().astype(np.uint8)
    return (x0, y0, x1, y1)


def outline(a, box, colour=(255, 40, 40), w=2):
    x0, y0, x1, y1 = box
    a[y0:y0 + w, x0:x1] = colour; a[max(0, y1 - w):y1, x0:x1] = colour
    a[y0:y1, x0:x0 + w] = colour; a[y0:y1, max(0, x1 - w):x1] = colour
