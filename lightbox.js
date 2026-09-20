/* ── figure lightbox ──────────────────────────────────────────
   Click any case-study figure to see it full size. Wiring is
   automatic: every <img> inside a <figure> becomes a zoom target,
   so new figures need no extra markup.

   Every figure behaves identically, whatever its shape. It opens
   fitted to the screen; clicking the image toggles full resolution,
   which can then be dragged to pan. A tall screenshot and a 3000px
   flow board get the same two states.

   Keyboard: Enter/Space opens, Esc closes, focus returns to the
   figure that was opened.

   Note on class names: everything here is prefixed lb-, because the
   case studies already use .wide for their page column and an
   unprefixed name gets styled by that rule instead.
------------------------------------------------------------- */
(() => {
  "use strict";

  function init() {
    const imgs = Array.from(document.querySelectorAll("figure img"));
    if (!imgs.length) return;

    const box = document.createElement("div");
    box.className = "lb";
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Full-size view");
    box.innerHTML =
      '<button class="lb-x" type="button" aria-label="Close full-size view">esc</button>' +
      '<div class="lb-stage" data-native-scroll><img class="lb-img" alt=""></div>' +
      '<p class="lb-cap"></p>';
    document.body.appendChild(box);

    const stage = box.querySelector(".lb-stage");
    const big = box.querySelector(".lb-img");
    const cap = box.querySelector(".lb-cap");
    const xBtn = box.querySelector(".lb-x");

    let opener = null;

    /* ── fit ⇄ full resolution ─────────────────────────────────
       One toggle for every figure, so nothing is a special case.
       Only offered when the image is bigger than the space it is
       being shown in.
    ---------------------------------------------------------- */
    const zoomable = () =>
      big.naturalWidth > stage.clientWidth || big.naturalHeight > stage.clientHeight;

    const setZoom = (on) => {
      box.classList.toggle("lb-zoomed", on);
      big.setAttribute("aria-label", on ? "Shrink to fit" : "View at full size");
      if (on) {
        // open on the middle of the board rather than its top-left corner
        stage.scrollLeft = (stage.scrollWidth - stage.clientWidth) / 2;
        stage.scrollTop = (stage.scrollHeight - stage.clientHeight) / 2;
      }
    };

    const syncZoomAffordance = () => box.classList.toggle("lb-can-zoom", zoomable());

    const open = (img) => {
      const fig = img.closest("figure");
      const caption = fig && fig.querySelector("figcaption");

      big.src = img.currentSrc || img.src;
      big.alt = img.alt || "";

      // the figure number is its own element, so textContent would run it
      // straight into the sentence
      cap.textContent = "";
      if (caption) {
        const no = caption.querySelector(".fno");
        const rest = caption.cloneNode(true);
        const dup = rest.querySelector(".fno");
        if (dup) dup.remove();
        if (no) {
          const tag = document.createElement("b");
          tag.className = "lb-no";
          tag.textContent = no.textContent.trim();
          cap.appendChild(tag);
        }
        cap.appendChild(document.createTextNode((no ? " " : "") + rest.textContent.trim()));
      }
      cap.hidden = !cap.textContent;

      opener = img;
      box.hidden = false;
      document.documentElement.classList.add("lb-open");
      setZoom(false);
      stage.scrollTop = 0;
      stage.scrollLeft = 0;

      // the thumbnail is lazy-loaded, so measure once the big one decodes
      if (big.complete) syncZoomAffordance();
      else big.addEventListener("load", syncZoomAffordance, { once: true });

      xBtn.focus();
    };

    const close = () => {
      if (box.hidden) return;
      box.hidden = true;
      document.documentElement.classList.remove("lb-open");
      box.classList.remove("lb-zoomed", "lb-can-zoom", "lb-dragging");
      big.removeAttribute("src");
      if (opener) opener.focus();
      opener = null;
    };

    imgs.forEach((img) => {
      img.classList.add("zoomable");
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      img.setAttribute("aria-label", (img.alt || "Figure") + " — open full size");
      img.addEventListener("click", () => open(img));
      img.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open(img);
        }
      });
    });

    big.addEventListener("click", (e) => {
      e.stopPropagation();
      if (zoomable()) setZoom(!box.classList.contains("lb-zoomed"));
    });

    /* ── drag to pan while zoomed ──────────────────────────── */
    let dragging = false;
    let sx = 0, sy = 0, sl = 0, st = 0;

    stage.addEventListener("pointerdown", (e) => {
      if (!box.classList.contains("lb-zoomed")) return;
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      sl = stage.scrollLeft; st = stage.scrollTop;
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      box.classList.add("lb-dragging");
    });
    stage.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      stage.scrollLeft = sl - (e.clientX - sx);
      stage.scrollTop = st - (e.clientY - sy);
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { stage.releasePointerCapture(e.pointerId); } catch (_) {}
      box.classList.remove("lb-dragging");
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);

    xBtn.addEventListener("click", close);
    // clicking the backdrop closes; clicking the image itself does not
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target === stage) close();
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      if (e.key === "Tab") {
        e.preventDefault();
        xBtn.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (!box.hidden) syncZoomAffordance();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
