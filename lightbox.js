/* ── figure lightbox ──────────────────────────────────────────
   Click any case-study screenshot to see it full size. Wiring is
   automatic: every <img> inside a <figure> on the page becomes a
   zoom target, so new figures need no extra markup.

   The overlay reuses the figure's own caption, and very wide
   boards stay pannable inside it rather than being shrunk to
   illegibility.

   Keyboard: Enter/Space opens, Esc closes, focus returns to the
   figure that was opened. Pointer-only users get a zoom cursor.
------------------------------------------------------------- */
(() => {
  "use strict";

  function init() {
    const imgs = Array.from(document.querySelectorAll("figure img"));
    if (!imgs.length) return;

    // ── the overlay, built once and reused ──────────────────
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
        // the separating space belongs to the tag, not to captions that
        // carry their number inline
        cap.appendChild(document.createTextNode((no ? " " : "") + rest.textContent.trim()));
      }
      cap.hidden = !cap.textContent;

      // A board much wider than it is tall is worth panning rather than
      // shrinking. Decide once the full-size image has decoded — the
      // thumbnail is lazy-loaded and may still report 0.
      box.classList.remove("wide");
      const measure = () => {
        if (!big.naturalHeight) return;
        box.classList.toggle("wide", big.naturalWidth / big.naturalHeight > 2.2);
      };
      if (big.complete) measure();
      else big.addEventListener("load", measure, { once: true });

      opener = img;
      box.hidden = false;
      document.documentElement.classList.add("lb-open");
      stage.scrollTop = 0;
      stage.scrollLeft = 0;
      xBtn.focus();
    };

    const close = () => {
      if (box.hidden) return;
      box.hidden = true;
      document.documentElement.classList.remove("lb-open");
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

    xBtn.addEventListener("click", close);
    // clicking the backdrop closes; clicking the image itself does not
    box.addEventListener("click", (e) => {
      if (e.target === box || e.target === stage) close();
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      // keep tab focus inside the dialog
      if (e.key === "Tab") {
        e.preventDefault();
        xBtn.focus();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
