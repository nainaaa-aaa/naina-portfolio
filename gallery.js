(() => {
  "use strict";

  // Must match #tileRef's width/height in gallery.html.
  const W = 1980;
  const H = 1420;

  function initInfiniteGallery() {
    const view = document.getElementById("viewRef");
    const field = document.getElementById("fieldRef");
    const tile = document.getElementById("tileRef");
    const heading = document.getElementById("headingRef");
    const coordRef = document.getElementById("coordRef");
    const recenterBtn = document.getElementById("recenterBtn");
    if (!view || !field || !tile) return;

    // 3x3 lattice of the authored tile, so the artwork wraps seamlessly in
    // both axes. The heading lives outside #fieldRef and is never cloned.
    if (!field.dataset.tiled) {
      field.dataset.tiled = "1";
      const frag = document.createDocumentFragment();
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (!i && !j) continue;
          const clone = tile.cloneNode(true);
          clone.removeAttribute("id");
          clone.setAttribute("aria-hidden", "true");
          clone.style.left = i * W + "px";
          clone.style.top = j * H + "px";
          frag.appendChild(clone);
        }
      }
      field.appendChild(frag);
    }

    // pos is the pan offset. pos = (0,0) is "home": the tile's centre and the
    // heading both sit dead centre of the viewport.
    const pos = { x: 0, y: 0 };
    let vel = { x: 0, y: 0 };
    let dragging = false;
    let last = null;
    let raf = null;

    // Constant that lines the tile's centre up with the viewport's centre.
    // Recomputed on resize so "centred" holds at any window size.
    let cx = 0, cy = 0;
    const measure = () => {
      cx = window.innerWidth / 2 - W / 2;
      cy = window.innerHeight / 2 - H / 2;
    };

    // Wrap into (-m, 0] so the lattice always covers the viewport.
    const wrap = (v, m) => {
      const r = v % m;
      return r > 0 ? r - m : r;
    };

    const apply = () => {
      field.style.transform =
        "translate(" + wrap(pos.x + cx, W).toFixed(1) + "px," + wrap(pos.y + cy, H).toFixed(1) + "px)";
      if (heading) {
        heading.style.transform =
          "translate(" + pos.x.toFixed(1) + "px, calc(-50% + " + pos.y.toFixed(1) + "px))";
      }
      view.style.backgroundPosition = pos.x.toFixed(1) + "px " + pos.y.toFixed(1) + "px";
      if (coordRef) {
        coordRef.textContent = Math.round(-pos.x) + ", " + Math.round(-pos.y);
      }
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

    // --- drag to pan, in any direction ---
    view.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a, button")) return;
      dragging = true;
      last = { x: e.clientX, y: e.clientY };
      vel = { x: 0, y: 0 };
      stopGlide();
      field.style.transition = "";
      if (heading) heading.style.transition = "";
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
      const ease = "transform .62s cubic-bezier(.22,.9,.28,1)";
      field.style.transition = ease;
      if (heading) heading.style.transition = ease;
      pos.x = 0;
      pos.y = 0;
      apply();
      window.setTimeout(() => {
        field.style.transition = "";
        if (heading) heading.style.transition = "";
      }, 660);
    };
    if (recenterBtn) recenterBtn.addEventListener("click", recenter);

    window.addEventListener("resize", () => { measure(); apply(); });

    measure();
    apply();
  }

  document.addEventListener("DOMContentLoaded", initInfiniteGallery);
})();
