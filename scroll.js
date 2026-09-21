/* ── smooth scroll + section hold ─────────────────────────────
   Two things, both progressive enhancements:

   1. Damped scrolling. Wheel input moves a target, and the page
      eases toward it, so the site reads slower and more composed
      than a raw wheel jump. Only wheel is intercepted — touch,
      keyboard, scrollbar dragging and anchor jumps stay native,
      because those already feel right and hijacking them breaks
      more than it buys.

   2. In-page links are animated here too. The browser's own smooth
      scroll is driven by rAF and competes with this one: a jump of
      several thousand pixels takes seconds, and any wheel movement
      during it lands on the handler below, cancels the native
      scroll and strands the reader mid-page. Driving both from one
      place means a nudge redirects the trip instead of killing it.

   3. Resistance over marked elements. Scrolling gets heavier as a
      [data-slow] element passes through the middle of the screen
      and returns to normal once it leaves, so the work cards get
      dwelled on instead of flying past. It never blocks: a firm
      scroll still moves, it just takes more of one.

   Bails out entirely on touch, on reduced-motion, and on short
   pages. Nothing here is required for the page to work.
------------------------------------------------------------- */
(() => {
  "use strict";

  const EASE = 0.082;      // per-frame approach; lower is slower
  const STEP = 1.0;        // wheel delta multiplier
  const LINE = 34;         // px per line when deltaMode is lines
  const SETTLE = 0.4;      // px below which we stop animating
  const DRAG = 0.72;       // how much speed is taken at peak resistance
  const ZONE = 0.62;       // share of the viewport the slow zone spans

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

    // ── resistance zones ────────────────────────────────────
    const slow = Array.from(document.querySelectorAll("[data-slow]"));

    const clamp = (v) => Math.max(0, Math.min(maxY(), v));

    // 0 when no marked element is near the middle of the screen, 1 when one
    // is centred on it. Measured from the element's own centre so a tall
    // section resists as it passes rather than the whole time it is on
    // screen.
    const resistance = () => {
      const vh = window.innerHeight;
      const mid = vh / 2;
      const span = vh * ZONE;
      let peak = 0;
      for (const el of slow) {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d >= span) continue;
        const t = 1 - d / span;
        // ease so the change in speed is felt gradually, not as a step
        peak = Math.max(peak, t * t * (3 - 2 * t));
      }
      return peak;
    };

    /* ── anchor jumps ───────────────────────────────────────
       A distance-scaled eased tween. The exponential approach used
       for the wheel starts far too fast over a 10,000px jump.
    ---------------------------------------------------------- */
    let tween = null;
    const easeInOutCubic = (t) =>
      t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    const cancelTween = () => { tween = null; };

    const glideTo = (y) => {
      const from = window.scrollY;
      const to = clamp(y);
      const dist = Math.abs(to - from);
      if (dist < 2) return;
      // 620ms for a short hop, up to 1100ms for a long one
      const ms = Math.min(1100, 620 + dist * 0.06);
      const t0 = performance.now();
      tween = { from: from, to: to, ms: ms, t0: t0 };
      const step = (now) => {
        if (!tween || tween.t0 !== t0) return;           // superseded or cancelled
        const p = Math.min(1, (now - t0) / ms);
        const y2 = tween.from + (tween.to - tween.from) * easeInOutCubic(p);
        window.scrollTo({ top: y2, behavior: "instant" });
        target = y2;
        if (p < 1) requestAnimationFrame(step);
        else { tween = null; target = to; }
      };
      requestAnimationFrame(step);
    };

    // Where an anchor target should come to rest, allowing for the fixed nav.
    const anchorY = (el) => {
      const pad = parseFloat(getComputedStyle(doc).scrollPaddingTop) || 0;
      return clamp(el.getBoundingClientRect().top + window.scrollY - pad);
    };

    document.addEventListener("click", (e) => {
      const link = e.target.closest && e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href").slice(1);
      if (!id) return;
      const el = document.getElementById(id);
      if (!el) return;
      e.preventDefault();
      if (running) { cancelAnimationFrame(raf); running = false; }
      glideTo(anchorY(el));
      // keep the URL honest without letting the browser jump
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    });

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

      cancelTween();                 // a nudge takes over from an anchor jump
      const raw = e.deltaMode === 1 ? e.deltaY * LINE
                : e.deltaMode === 2 ? e.deltaY * window.innerHeight
                : e.deltaY;

      // heavier over a marked element, normal everywhere else
      const delta = raw * STEP * (1 - DRAG * resistance());
      target = clamp(target + delta);
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
    window.addEventListener("hashchange", () => {
      if (running) { cancelAnimationFrame(raf); running = false; }
      const el = location.hash && document.getElementById(location.hash.slice(1));
      if (el) glideTo(anchorY(el));
      else target = window.scrollY;
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
