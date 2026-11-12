"""Lay the eight skills into a word-search grid so every crossing agrees.

    python3 wordsearch_solve.py 12 15      # columns rows

Prints the letter rows and the WORDS coordinates for main.js. Words longer
than the column count are forced to run down. Afterwards, trace all eight
in the browser before trusting it.
"""
import random, sys

WORDS = [("ux", "UXRESEARCH"), ("ia", "ARCHITECTURE"), ("proto", "PROTOTYPING"),
         ("design", "DESIGNSYSTEMS"), ("access", "ACCESSIBILITY"),
         ("flows", "USERFLOWS"), ("motion", "MOTION"), ("brand", "BRANDING")]


def solve(cols, rows, down_ids, seed):
    rnd = random.Random(seed)
    order = sorted(WORDS, key=lambda x: -len(x[1]))

    def rec(grid, out, i):
        if i == len(order):
            return dict(grid), dict(out)
        wid, w = order[i]
        down = wid in down_ids
        spots = ([(r, c) for c in range(cols) for r in range(rows - len(w) + 1)] if down
                 else [(r, c) for r in range(rows) for c in range(cols - len(w) + 1)])
        rnd.shuffle(spots)
        for r, c in spots:
            cells, ok = [], True
            for k, ch in enumerate(w):
                rr, cc = (r + k, c) if down else (r, c + k)
                cur = grid.get((rr, cc))
                if cur and cur != ch:
                    ok = False; break
                cells.append((rr, cc, ch))
            if not ok:
                continue
            # never two words sharing one line in the same direction
            if any(o[2] == down and (o[1] == c if down else o[0] == r) for o in out.values()):
                continue
            g2 = dict(grid)
            for rr, cc, ch in cells:
                g2[(rr, cc)] = ch
            o2 = dict(out); o2[wid] = (r, c, down, len(w))
            res = rec(g2, o2, i + 1)
            if res:
                return res
        return None
    return rec({}, {}, 0)


if __name__ == "__main__":
    cols, rows = int(sys.argv[1]), int(sys.argv[2])
    down_ids = {wid for wid, w in WORDS if len(w) > cols}
    for seed in range(500):
        res = solve(cols, rows, down_ids, seed)
        if res:
            break
    else:
        sys.exit("no layout found — try more rows")
    grid, out = res
    rnd = random.Random(seed + 77)
    letters = ["".join(grid.get((r, c)) or rnd.choice("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
                       for c in range(cols)) for r in range(rows)]
    print("letters:", letters)
    for wid, w in WORDS:
        r, c, d, n = out[wid]
        r1, c1 = (r + n - 1, c) if d else (r, c + n - 1)
        print('  { id: "%s", r0: %d, c0: %d, r1: %d, c1: %d }, // %s' % (wid, r, c, r1, c1, w))
