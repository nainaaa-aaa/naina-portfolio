(() => {
  "use strict";

  /* ── scroll-driven tilt ──────────────────────────────────────────
     Figures start pitched back on the X axis and flatten as they rise
     through the viewport, so a shot reads as a physical object being
     laid down rather than a static screenshot.

     Progress is measured from the element's own centre: 0 while the
     figure is still a viewport-height below the fold, 1 once its centre
     reaches the upper third. Only elements currently intersecting are
     written to, so the scroll handler stays cheap on a long page.
  ---------------------------------------------------------------- */
  const MAX_TILT = 20;   // degrees, matches the reference feel
  const MAX_LIFT = 1.05; // slight scale-up while still tilted

  function initTilt() {
    const figures = Array.from(document.querySelectorAll("[data-tilt]"));
    if (!figures.length) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches) {
      figures.forEach((f) => f.style.setProperty("--tilt-deg", "0deg"));
      return;
    }

    const live = new Set();
    let queued = false;

    const paint = () => {
      queued = false;
      const vh = window.innerHeight;
      live.forEach((el) => {
        const r = el.getBoundingClientRect();
        const centre = r.top + r.height / 2;
        // 1 when the centre has climbed to a third of the viewport,
        // 0 when it is still a full viewport below the fold.
        const raw = (vh * 1.15 - centre) / (vh * 0.82);
        const p = Math.max(0, Math.min(1, raw));
        const eased = 1 - Math.pow(1 - p, 3);
        el.style.setProperty("--tilt-deg", ((1 - eased) * MAX_TILT).toFixed(2) + "deg");
        el.style.setProperty("--tilt-scale", (1 + (1 - eased) * (MAX_LIFT - 1)).toFixed(4));
      });
    };

    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) live.add(e.target);
          else live.delete(e.target);
        });
        request();
      },
      { rootMargin: "40% 0px 40% 0px" }
    );
    figures.forEach((f) => io.observe(f));

    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    // rAF is frozen while the page is in a background tab, so a paint
    // queued during that time never lands. Re-queue on the way back in
    // rather than showing whatever tilt was last written.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        queued = false;
        request();
      }
    });
    request();
  }

  /* ── progress rail ──────────────────────────────────────────────
     A thin bar showing how far through the study you are. Cheap way to
     signal length on a page this long.
  ---------------------------------------------------------------- */
  function initProgress() {
    const bar = document.getElementById("readProgress");
    if (!bar) return;
    let queued = false;
    const paint = () => {
      queued = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const p = max > 0 ? window.scrollY / max : 0;
      bar.style.transform = "scaleX(" + Math.max(0, Math.min(1, p)).toFixed(4) + ")";
    };
    const request = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(paint);
    };
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request);
    paint();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initTilt();
    initProgress();
  });
})();
