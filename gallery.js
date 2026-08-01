(() => {
  "use strict";

  function initInfiniteGallery() {
    const view = document.getElementById("viewRef");
    const field = document.getElementById("fieldRef");
    const tile = document.getElementById("tileRef");
    const textRef = document.getElementById("textRef");
    const coordRef = document.getElementById("coordRef");
    if (!view || !field || !tile) return;

    const W = 2400, H = 1800;
    const pos = { x: -180, y: -120 };
    let vel = { x: 0, y: 0 };

    // 3×3 lattice of the authored tile → seamless wrap in both axes
    if (!field.dataset.tiled) {
      field.dataset.tiled = "1";
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (!i && !j) continue;
          const c = tile.cloneNode(true);
          c.removeAttribute("id");
          c.setAttribute("aria-hidden", "true");
          c.style.left = i * W + "px";
          c.style.top = j * H + "px";
          field.appendChild(c);
        }
      }
    }

    let dragging = false, last = null, raf = null;
    const wrap = (v, m) => { const r = v % m; return r > 0 ? r - m : r; };

    const apply = () => {
      field.style.transform = "translate(" + wrap(pos.x, W).toFixed(1) + "px," + wrap(pos.y, H).toFixed(1) + "px)";
      view.style.backgroundPosition = pos.x.toFixed(1) + "px " + pos.y.toFixed(1) + "px";
      if (textRef) {
        textRef.style.transform = "translate(" + pos.x.toFixed(1) + "px, calc(-50% + " + pos.y.toFixed(1) + "px))";
      }
      if (coordRef) {
        coordRef.textContent = Math.round(-pos.x) + ", " + Math.round(-pos.y);
      }
    };

    const glide = () => {
      vel.x *= 0.93; vel.y *= 0.93;
      if (Math.abs(vel.x) < 0.15 && Math.abs(vel.y) < 0.15) { raf = null; return; }
      pos.x += vel.x; pos.y += vel.y;
      apply();
      raf = requestAnimationFrame(glide);
    };

    view.addEventListener("pointerdown", (e) => {
      if (e.target.closest("a")) return;
      dragging = true; last = { x: e.clientX, y: e.clientY };
      vel = { x: 0, y: 0 };
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      view.style.cursor = "grabbing";
    });
    window.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      last = { x: e.clientX, y: e.clientY };
      vel = { x: dx, y: dy };
      pos.x += dx; pos.y += dy;
      apply();
    });
    window.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      view.style.cursor = "grab";
      if (!raf) raf = requestAnimationFrame(glide);
    });
    view.addEventListener("wheel", (e) => {
      e.preventDefault();
      pos.x -= e.deltaX; pos.y -= e.deltaY;
      apply();
    }, { passive: false });

    apply();
  }

  document.addEventListener("DOMContentLoaded", initInfiniteGallery);
})();
