(() => {
  "use strict";

  // The canvas is generated, not tiled. Every screen-sized patch is built
  // from a deterministic hash of its grid cell, so panning back to a place
  // shows exactly what was there before without any of it repeating on a
  // fixed period — and there is no reserved hole anywhere, because the
  // pinned pieces (heading, the two games) simply tell the generator to
  // skip the cells they occupy.
  // Sized from the largest card at run time, so a card can never reach
  // out of its own cell into a neighbour's.
  let CELL_W = 400;
  let CELL_H = 380;

  // Cards are not all one size. A canvas of identically sized cards reads
  // as a grid however you place them; varying the scale is most of what
  // makes a scattered layout look composed.
  const SCALE_MIN = 0.62;
  const SCALE_MAX = 1.32;
  const MARGIN = 2;            // extra rings of cells built beyond the viewport

  const MOBILE_Q = "(max-width: 760px)";
  const tileScale = () => (window.matchMedia(MOBILE_Q).matches ? 0.72 : 1);

  // A small integer hash. Same cell in, same value out, every time.
  const hash = (i, j, salt) => {
    let h = (i * 374761393 + j * 668265263 + salt * 2246822519) | 0;
    h = (h ^ (h >>> 13)) * 1274126177;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };

  function initInfiniteGallery() {
    const view = document.getElementById("viewRef");
    const field = document.getElementById("fieldRef");
    const tile = document.getElementById("tileRef");
    const coordRef = document.getElementById("coordRef");
    const recenterBtn = document.getElementById("recenterBtn");
    if (!view || !field || !tile) return;

    // The authored markup is the library: every figure in #tileRef becomes a
    // template the generator can place. The tile itself stops being a layout.
    const templates = Array.from(tile.querySelectorAll("figure")).map((fig) => {
      const node = fig.cloneNode(true);
      node.style.position = "absolute";
      node.style.left = "0";
      node.style.top = "0";
      const w = parseInt(fig.style.width, 10) || 230;
      // frame + image + caption, read off the markup rather than guessed
      const inner = fig.querySelector("div[style*='height']");
      const imgH = inner ? parseInt((inner.getAttribute("style").match(/height:(\d+)px/) || [])[1], 10) : 0;
      return { node: node, w: w, h: (imgH || Math.round(w * 1.1)) + 72 };
    });
    const MAX_W = Math.max.apply(null, templates.map((t) => t.w));
    const MAX_H = Math.max.apply(null, templates.map((t) => t.h));
    const props = Array.from(tile.querySelectorAll(":scope > div")).map((d) => d.cloneNode(true));

    let lattice = document.getElementById("latticeRef");
    if (!lattice) {
      lattice = document.createElement("div");
      lattice.id = "latticeRef";
      lattice.style.position = "absolute";
      lattice.style.left = "0";
      lattice.style.top = "0";
      lattice.style.transformOrigin = "0 0";
      field.appendChild(lattice);
    }
    tile.remove();                       // its contents live on as templates

    // generous cells, so even neighbouring cards sit well apart
    CELL_W = Math.round(MAX_W * SCALE_MAX) + 215;
    CELL_H = Math.round(MAX_H * SCALE_MAX) + 175;

    /* ── tic-tac-toe ────────────────────────────────────────
       A single board, pinned above the lattice, in the open space
       down and right of the heading.
    ---------------------------------------------------------- */
    (function tictactoe() {
      const board = document.getElementById("tttRef");
      if (!board) return;

      const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      let cells = Array(9).fill("");
      let over = false;

      const winner = (b) => {
        for (const l of LINES) {
          if (b[l[0]] && b[l[0]] === b[l[1]] && b[l[1]] === b[l[2]]) return { mark: b[l[0]], line: l };
        }
        return b.every(Boolean) ? { mark: "draw", line: [] } : null;
      };

      // Win if you can, block if you must, then centre, corner, side.
      const aiMove = (b) => {
        for (const mark of ["O", "X"]) {
          for (const l of LINES) {
            const vals = l.map((i) => b[i]);
            if (vals.filter((v) => v === mark).length === 2 && vals.includes("")) {
              return l[vals.indexOf("")];
            }
          }
        }
        const pick = (list) => list.filter((i) => !b[i]);
        const order = pick([4]).concat(pick([0,2,6,8]), pick([1,3,5,7]));
        return order.length ? order[Math.floor(Math.random() * order.length)] : -1;
      };

      const render = () => {
        const w = winner(cells);
        over = !!w;
        const label = !w ? "YOUR TURN"
          : w.mark === "draw" ? "A DRAW" : w.mark === "X" ? "YOU WIN" : "I WIN";
        board.querySelectorAll(".ttt-c").forEach((btn, i) => {
          btn.textContent = cells[i];
          btn.classList.toggle("x", cells[i] === "X");
          btn.classList.toggle("o", cells[i] === "O");
          btn.classList.toggle("win", !!w && w.line.includes(i));
          btn.disabled = over || !!cells[i];
        });
        const st = board.querySelector(".ttt-status");
        if (st) st.textContent = label;
      };

      const play = (i) => {
        if (over || cells[i]) return;
        cells[i] = "X";
        if (!winner(cells)) {
          const m = aiMove(cells);
          if (m >= 0) cells[m] = "O";
        }
        render();
      };

      const reset = () => { cells = Array(9).fill(""); over = false; render(); };

      board.addEventListener("click", (e) => {
        const cell = e.target.closest(".ttt-c");
        if (cell) { play(Number(cell.dataset.i)); return; }
        if (e.target.closest(".ttt-reset")) reset();
      });

      render();
    })();

    /* ── rock paper scissors ────────────────────────────────
       Pinned in the lower-left of the canvas, away from the board.
    ---------------------------------------------------------- */
    (function rps() {
      const card = document.getElementById("rpsRef");
      if (!card) return;

      // The three hands are already in the markup, on the buttons; the
      // throw area just borrows whichever one was played.
      const art = {};
      card.querySelectorAll(".rps-b").forEach((b) => { art[b.dataset.p] = b.innerHTML; });
      const BEATS = { rock: "scissors", paper: "rock", scissors: "paper" };
      const KEYS = ["rock", "paper", "scissors"];

      const me = card.querySelector("[data-me]");
      const ai = card.querySelector("[data-ai]");
      const msg = card.querySelector(".rps-msg");
      const score = card.querySelector(".rps-score");
      let mine = 0, theirs = 0;

      me.classList.add("me");

      const play = (pick) => {
        const theirPick = KEYS[Math.floor(Math.random() * 3)];
        me.innerHTML = art[pick] || "";
        ai.innerHTML = art[theirPick] || "";
        let line;
        if (pick === theirPick) line = "A tie.";
        else if (BEATS[pick] === theirPick) { mine++; line = "You win that one."; }
        else { theirs++; line = "Mine, I think."; }
        msg.textContent = line;
        score.textContent = mine + " \u2013 " + theirs;
      };

      card.addEventListener("click", (e) => {
        const btn = e.target.closest(".rps-b");
        if (btn) play(btn.dataset.p);
      });
    })();

    // The pieces that exist exactly once. Each sits at a fixed canvas
    // position and reserves a box the generator will not place cards into,
    // which is what keeps them in clear space instead of under a photo.
    const pinned = [
      { id: "headingRef", ox: 0,    oy: 0,   w: 640, h: 250 },
      { id: "tttRef",     ox: 620,  oy: -400, w: 300, h: 340 },
      { id: "rpsRef",     ox: -660, oy: 360,  w: 284, h: 300 },
    ]
      .map((pin) => Object.assign(pin, { el: document.getElementById(pin.id) }))
      .filter((pin) => pin.el);

    const reserved = pinned.map((pin) => ({
      x: pin.ox - pin.w / 2 - 16,
      y: pin.oy - pin.h / 2 - 16,
      w: pin.w + 32,
      h: pin.h + 32,
    }));

    // The field and everything pinned to it must ease together, or the
    // heading slides while the artwork snaps.
    const setPinTransition = (value) => {
      field.style.transition = value;
      pinned.forEach((pin) => { pin.el.style.transition = value; });
    };

    // pos is the pan offset. pos = (0,0) is "home": the tile's centre and the
    // heading both sit dead centre of the viewport.
    const pos = { x: 0, y: 0 };
    let vel = { x: 0, y: 0 };
    let dragging = false;
    let last = null;
    let raf = null;

    // The canvas origin sits at the viewport centre, so canvas (0,0) is
    // wherever "home" is. Recomputed on resize so that stays true.
    let cx = 0, cy = 0;
    let scale = 1;
    const measure = () => {
      scale = tileScale();
      lattice.style.transform = scale === 1 ? "" : "scale(" + scale + ")";
      cx = window.innerWidth / 2;
      cy = window.innerHeight / 2;
    };

    /* ── the generator ──────────────────────────────────────────
       Each grid cell holds at most one card, positioned by a hash of
       the cell so it never changes between visits. Cells whose card
       would land on a pinned piece are skipped, which is what removes
       the old reserved hole: nothing is reserved anywhere else.
    ---------------------------------------------------------- */
    const live = new Map();          // "i,j" -> element

    const hits = (x, y, w, h) =>
      reserved.some((r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y);

    // A cell is only a spatial index, not a slot: a card may sit anywhere
    // inside it. That is what stops the field reading as rows and columns.
    // Because every card's position is a pure function of its cell, a cell
    // can look at its neighbours and decide, without any shared state and in
    // any order, whether it is the one that has to give way.
    const MIN_GAP = 46;                 // clear space to keep between cards

    const occupied = (i, j) => hash(i, j, 1) < 0.92;
    const rank = (i, j) => hash(i, j, 77);

    const spot = (i, j) => {
      const N = templates.length;
      const idx = (((i + 3 * j) % N) + N) % N;
      const t = templates[idx];
      const k = SCALE_MIN + hash(i, j, 12) * (SCALE_MAX - SCALE_MIN);
      const w = Math.round(t.w * k);
      const h = Math.round(t.h * k);
      return {
        t: t, idx: idx, k: k, w: w, h: h,
        x: Math.round(i * CELL_W + hash(i, j, 3) * Math.max(0, CELL_W - w)),
        y: Math.round(j * CELL_H + hash(i, j, 4) * Math.max(0, CELL_H - h)),
      };
    };

    const tooClose = (a2, b2) =>
      a2.x < b2.x + b2.w + MIN_GAP && a2.x + a2.w + MIN_GAP > b2.x &&
      a2.y < b2.y + b2.h + MIN_GAP && a2.y + a2.h + MIN_GAP > b2.y;

    const buildCell = (i, j) => {
      if (!occupied(i, j)) return null;
      const self = spot(i, j);
      if (hits(self.x, self.y, self.w, self.h)) return null;

      // Defer to any crowding neighbour that outranks this cell.
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          if (!di && !dj) continue;
          const ni = i + di, nj = j + dj;
          if (!occupied(ni, nj)) continue;
          const other = spot(ni, nj);
          if (hits(other.x, other.y, other.w, other.h)) continue;
          if (tooClose(self, other) && rank(ni, nj) > rank(i, j)) return null;
        }
      }

      const node = self.t.node.cloneNode(true);
      node.style.left = self.x + "px";
      node.style.top = self.y + "px";
      node.style.width = self.t.w + "px";
      node.style.transformOrigin = "0 0";
      node.style.transform =
        "scale(" + self.k.toFixed(3) + ") rotate(" + (hash(i, j, 5) * 4 - 2).toFixed(2) + "deg)";
      if (hash(i, j, 6) > 0.5) node.setAttribute("aria-hidden", "true");

      const wrapEl = document.createElement("div");
      wrapEl.style.position = "absolute";
      wrapEl.style.left = "0";
      wrapEl.style.top = "0";
      wrapEl.appendChild(node);

      if (props.length && hash(i, j, 7) > 0.78) {
        const prop = props[Math.floor(hash(i, j, 8) * props.length) % props.length].cloneNode(true);
        prop.style.position = "absolute";
        prop.style.left = Math.round(i * CELL_W + hash(i, j, 9) * CELL_W) + "px";
        prop.style.top = Math.round(j * CELL_H + hash(i, j, 10) * CELL_H) + "px";
        prop.setAttribute("aria-hidden", "true");
        wrapEl.appendChild(prop);
      }
      return wrapEl;
    };

    const cull = () => {
      const halfW = cx / scale, halfH = cy / scale;
      const left = -pos.x / scale - halfW;
      const top = -pos.y / scale - halfH;
      const i0 = Math.floor(left / CELL_W) - MARGIN;
      const i1 = Math.ceil((left + halfW * 2) / CELL_W) + MARGIN;
      const j0 = Math.floor(top / CELL_H) - MARGIN;
      const j1 = Math.ceil((top + halfH * 2) / CELL_H) + MARGIN;

      const want = new Set();
      for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
          const key = i + "," + j;
          want.add(key);
          if (live.has(key)) continue;
          const el = buildCell(i, j);
          live.set(key, el);            // null is remembered too, so an empty
          if (el) lattice.appendChild(el); // cell is not rebuilt every pan
        }
      }
      live.forEach((el, key) => {
        if (want.has(key)) return;
        if (el && el.parentNode) el.remove();
        live.delete(key);
      });
    };

    const apply = () => {
      field.style.transform =
        "translate(" + (pos.x + cx).toFixed(1) + "px," + (pos.y + cy).toFixed(1) + "px)";
      pinned.forEach((pin) => {
        pin.el.style.transform =
          "translate(calc(" + pin.ox + "px + " + pos.x.toFixed(1) + "px), calc(-50% + " +
          pin.oy + "px + " + pos.y.toFixed(1) + "px))";
      });
      view.style.backgroundPosition = pos.x.toFixed(1) + "px " + pos.y.toFixed(1) + "px";
      if (coordRef) {
        coordRef.textContent = Math.round(-pos.x) + ", " + Math.round(-pos.y);
      }
      cull();
    };

    const stopGlide = () => {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
    };

    const glide = () => {
      vel.x *= 0.93;
      vel.y *= 0.93;
      if (Math.abs(vel.x) < 0.15 && Math.abs(vel.y) < 0.15) { raf = null; return; }
      pos.x += vel.x;
      pos.y += vel.y;
      apply();
      raf = requestAnimationFrame(glide);
    };

    // Never let a pan turn into a native image drag (the translucent
    // "ghost" the browser drags around). CSS covers selection; this
    // covers the drag gesture itself.
    view.addEventListener("dragstart", (e) => e.preventDefault());

    // --- drag to pan, in any direction ---
    view.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      // Suppress the default selection gesture that would otherwise
      // highlight captions and images as the pointer moves.
      e.preventDefault();
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      vel = { x: 0, y: 0 };
      stopGlide();
      setPinTransition("");
      view.classList.add("dragging");
      view.setPointerCapture?.(e.pointerId);
    });

    view.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      vel = { x: dx, y: dy };
      pos.x += dx;
      pos.y += dy;
      apply();
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      view.classList.remove("dragging");
      if (e) view.releasePointerCapture?.(e.pointerId);
      if (!raf) raf = requestAnimationFrame(glide);
    };
    view.addEventListener("pointerup", endDrag);
    view.addEventListener("pointercancel", endDrag);

    // --- trackpad / wheel pans too ---
    view.addEventListener("wheel", (e) => {
      e.preventDefault();
      stopGlide();
      pos.x -= e.deltaX;
      pos.y -= e.deltaY;
      apply();
    }, { passive: false });

    // --- arrow keys, for keyboard users ---
    window.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 240 : 80;
      const nudge = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (!nudge) return;
      e.preventDefault();
      stopGlide();
      pos.x += nudge[0];
      pos.y += nudge[1];
      apply();
    });

    // --- recenter ---
    const recenter = () => {
      vel = { x: 0, y: 0 };
      stopGlide();
      setPinTransition("transform .62s cubic-bezier(.22,.9,.28,1)");
      pos.x = 0;
      pos.y = 0;
      apply();
      window.setTimeout(() => setPinTransition(""), 660);
    };
    if (recenterBtn) recenterBtn.addEventListener("click", recenter);

    window.addEventListener("resize", () => { measure(); apply(); });

    measure();
    apply();
  }

  document.addEventListener("DOMContentLoaded", initInfiniteGallery);
})();
