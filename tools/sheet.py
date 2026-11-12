"""Contact sheet: many images in one grid, so they can be checked at once.

    python3 sheet.py out.png a.png b.png c.png ...
"""
import sys
import numpy as np
import img


def fit(a, cw, ch):
    h, w = a.shape[:2]
    s = min(cw / w, ch / h)
    nw, nh = max(1, int(w * s)), max(1, int(h * s))
    yi = (np.arange(nh) / s).astype(int).clip(0, h - 1)
    xi = (np.arange(nw) / s).astype(int).clip(0, w - 1)
    return a[yi][:, xi]


def sheet(paths, out, cols=4, cw=430, ch=300, pad=6):
    rows = (len(paths) + cols - 1) // cols
    canvas = np.full((rows * (ch + pad) + pad, cols * (cw + pad) + pad, 3), 40, np.uint8)
    for i, p in enumerate(paths):
        r, c = divmod(i, cols)
        t = fit(img.load(p), cw, ch)
        y = pad + r * (ch + pad); x = pad + c * (cw + pad)
        canvas[y:y + t.shape[0], x:x + t.shape[1]] = t
    img.save(out, canvas)
    for i, p in enumerate(paths):
        print(i + 1, p)


if __name__ == "__main__":
    sheet(sys.argv[2:], sys.argv[1])
