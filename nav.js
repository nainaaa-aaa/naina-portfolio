/* ── <site-nav> ───────────────────────────────────────────────
   One navigation for every page. Pages configure it with
   attributes rather than by copying markup:

     <site-nav current="home"></site-nav>
     <site-nav current="gallery" variant="overlay"></site-nav>

   current  home | gallery | resume — marks the active link.
   variant  overlay — white backing chips, for the gallery, where
            the nav sits on top of artwork instead of paper.

   Colours come from --nav-bg / --nav-ink / --nav-muted, so a page
   with a different background tunes the bar without forking it.

   Light DOM on purpose, so page scripts can still reach #siteNav
   and .navlink; a shadow root would hide them.
------------------------------------------------------------- */
(() => {
  "use strict";

  // Only whole-page destinations live here. Mixing in-page anchors with
  // page links made the same control behave two different ways, so Work
  // and Contact were dropped — both are reached from the page itself.
  const LINKS = [
    { key: "home",    label: "Home",    href: "index.html" },
    { key: "gallery", label: "Gallery", href: "gallery.html" },
    { key: "resume",  label: "Resume",  href: "resume.html" },
  ];

  class SiteNav extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return; // moving the node must not rebuild it
      this.dataset.ready = "1";

      const current = this.getAttribute("current") || "home";

      const links = LINKS.map((l) => {
        const on = l.key === current;
        return (
          '<a class="navlink" data-nav="' + l.key + '" href="' + l.href + '"' +
          (on ? ' aria-current="page"' : "") + ">" +
          l.label + '<span class="navbar"></span></a>'
        );
      }).join("");

      this.innerHTML =
        '<nav class="sitenav" aria-label="Primary">' +
          '<a class="mark" href="index.html">naina.</a>' +
          '<div class="navlinks" id="siteNav">' + links + "</div>" +
        "</nav>";
    }
  }

  customElements.define("site-nav", SiteNav);
})();
