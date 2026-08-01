(() => {
  "use strict";

  // Tile-space coordinates of the heading's centre — must match #textRef's
  // left/top in gallery.html (left:950px, top:700px on a 1900×1400 tile).
  const HEADING_X = 950;
  const HEADING_Y = 700;

  function initInfiniteGallery() {
    const view = document.getElementById("viewRef");
    const field = document.getElementById("fieldRef");
    const tile = document.getElementById("tileRef");
    const coordRef = document.getElementById("coordRef");
    if (!view || !field || !tile) return;

    const W = 1900, H = 1400;
    const pos = { x: 0, y: 0 };
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

    // Where "home" is: the heading's world point centred under the current viewport.
    const homePos = () => ({
      x: window.innerWidth / 2 - HEADING_X,
      y: window.innerHeight / 2 - HEADING_Y,
    });

    let dragging = false, last = null, raf = null;
    const wrap = (v, m) => { const r = v % m; return r > 0 ? r - m : r; };

    const apply = () => {
      field.style.transform = "translate(" + wrap(pos.x, W).toFixed(1) + "px," + wrap(pos.y, H).toFixed(1) + "px)";
      view.style.backgroundPosition = pos.x.toFixed(1) + "px " + pos.y.toFixed(1) + "px";
      if (coordRef) {
        const home = homePos();
        coordRef.textContent = Math.round(pos.x - home.x) + ", " + Math.round(pos.y - home.y);
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
      if (e.target.closest("a, button")) return;
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

    const recenterBtn = document.getElementById("recenterBtn");
    if (recenterBtn) {
      recenterBtn.addEventListener("click", () => {
        vel = { x: 0, y: 0 };
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        field.style.transition = "transform .6s cubic-bezier(.2,.85,.3,1)";
        const home = homePos();
        pos.x = home.x; pos.y = home.y;
        apply();
        window.setTimeout(() => { field.style.transition = ""; }, 620);
      });
    }

    // Open centred on the heading, whatever the viewport size turns out to be.
    const home = homePos();
    pos.x = home.x; pos.y = home.y;
    apply();
  }

  document.addEventListener("DOMContentLoaded", initInfiniteGallery);
})();
