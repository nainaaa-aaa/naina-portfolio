/* ── smooth scroll + section hold ─────────────────────────────
   Two things, both progressive enhancements:

   1. Damped scrolling. Wheel input moves a target, and the page
      eases toward it, so the site reads slower and more composed
      than a raw wheel jump. Only wheel is intercepted — touch,
      keyboard, scrollbar dragging and anchor jumps stay native,
      because those already feel right and hijacking them breaks
      more than it buys.

   2. A hold on marked sections. An element with data-hold stops
      the page once as it arrives, and it takes a fresh gesture to
      carry on past it. That's what makes the work section land
      instead of flying by.

   Bails out entirely on touch, on reduced-motion, and on short
   pages. Nothing here is required for the page to work.
------------------------------------------------------------- */
(() => {
  "use strict";

  const EASE = 0.082;      // per-frame approach; lower is slower
  const STEP = 1.0;        // wheel delta multiplier
  const LINE = 34;         // px per line when deltaMode is lines
  const SETTLE = 0.4;      // px below which we stop animating
  const REARM_MS = 420;    // quiet time before a hold can release

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");

  function init() {
    if (reduced.matches || coarse.matches) return;

    const doc = document.documentElement;
    const maxY = () => doc.scrollHeight - window.innerHeight;
    if (maxY() < window.innerHeight) return; // nothing to smooth

    let target = window.scrollY;
    let running = false;
    let raf = 0;

    // ── holds ───────────────────────────────────────────────
    const holds = Array.from(document.querySelectorAll("[data-hold]"));
    let heldAt = null;       // the y we are parked on
    let lastWheel = 0;

    const clamp = (v) => Math.max(0, Math.min(maxY(), v));

    // Where a hold section should sit: centred if it fits, top-aligned
    // with room for the nav if it doesn't.
    const holdY = (el) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      const h = el.offsetHeight;
      const vh = window.innerHeight;
      return clamp(h < vh ? top - (vh - h) / 2 : top - 64);
    };

    // The first hold we would cross going from `from` to `to`.
    const crossing = (from, to) => {
      if (to <= from) return null; // downward only
      for (const el of holds) {
        const y = holdY(el);
        if (y > from + 2 && y <= to && y !== heldAt) return y;
      }
      return null;
    };

    const frame = () => {
      const diff = target - window.scrollY;
      if (Math.abs(diff) < SETTLE) {
        window.scrollTo({ top: target, behavior: "instant" });
        running = false;
        return;
      }
      window.scrollTo({ top: window.scrollY + diff * EASE, behavior: "instant" });
      raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return;                      // pinch-zoom
      // e.target is not always an Element (it can be the document or a
      // text node), so guard before reaching for closest()
      const t = e.target;
      if (t && t.closest && t.closest("[data-native-scroll]")) return;
      // an open overlay owns the wheel; the page behind it must not move
      if (doc.classList.contains("lb-open")) return;
      e.preventDefault();

      const now = performance.now();
      const quiet = now - lastWheel > REARM_MS;
      lastWheel = now;

      // Parked on a hold: the gesture that arrived is absorbed. Only a
      // new gesture, after a pause, moves on.
      if (heldAt !== null) {
        if (!quiet) return;
        heldAt = null;
      }

      const delta = e.deltaMode === 1 ? e.deltaY * LINE
                  : e.deltaMode === 2 ? e.deltaY * window.innerHeight
                  : e.deltaY;
      const next = clamp(target + delta * STEP);

      const stop = crossing(target, next);
      if (stop !== null) {
        target = stop;
        heldAt = stop;
      } else {
        target = next;
      }
      start();
    };

    // Anything that moves the page by other means resyncs the target,
    // so the next wheel tick continues from where the page actually is.
    const resync = () => {
      if (!running) target = window.scrollY;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", resync, { passive: true });
    window.addEventListener("resize", () => { target = clamp(window.scrollY); });
    // a jump to an anchor should clear any parked state
    window.addEventListener("hashchange", () => {
      heldAt = null;
      if (running) { cancelAnimationFrame(raf); running = false; }
      target = window.scrollY;
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && running) { cancelAnimationFrame(raf); running = false; }
      target = window.scrollY;
    });
  }

  /* ── reveal: the project cards part from the centre ────────
     The pre-state lives in the cascade behind html.js, so the
     cards are hidden on the first paint rather than flashing into
     place first. All this does is signal arrival.
  ---------------------------------------------------------- */
  function initReveal() {
    const groups = document.querySelectorAll("[data-spread]");
    if (!groups.length) return;

    if (reduced.matches) {
      groups.forEach((g) => g.classList.add("spread-in"));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("spread-in");
        io.unobserve(e.target);
      }),
      { threshold: 0.25 }
    );
    groups.forEach((g) => io.observe(g));
  }

  document.addEventListener("DOMContentLoaded", () => {
    init();
    initReveal();
  });
})();
