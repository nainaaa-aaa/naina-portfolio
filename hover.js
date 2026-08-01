(() => {
  "use strict";

  function parseDecl(str) {
    const out = {};
    str.split(";").forEach((decl) => {
      const i = decl.indexOf(":");
      if (i === -1) return;
      const prop = decl.slice(0, i).trim();
      const val = decl.slice(i + 1).trim();
      if (!prop || !val) return;
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      out[camel] = val;
    });
    return out;
  }

  function initHoverStyles() {
    document.querySelectorAll("[data-hover]").forEach((el) => {
      const hoverDecl = parseDecl(el.getAttribute("data-hover"));
      const baseDecl = {};
      Object.keys(hoverDecl).forEach((prop) => {
        baseDecl[prop] = el.style[prop] || "";
      });
      el.addEventListener("mouseenter", () => Object.assign(el.style, hoverDecl));
      el.addEventListener("mouseleave", () => Object.assign(el.style, baseDecl));
    });
  }

  document.addEventListener("DOMContentLoaded", initHoverStyles);
})();
