/* ── <site-nav> ───────────────────────────────────────────────
   One navigation for every page. Pages configure it with
   attributes rather than by copying markup:

     <site-nav current="work"></site-nav>
     <site-nav current="gallery" variant="overlay"></site-nav>

   current  home | work | gallery | resume | contact
            marks the active link, and tells the component whether
            the Home and Contact links are in-page anchors or
            cross-page hrefs.
   variant  overlay — white backing chips, for the gallery, where
            the nav sits on top of artwork instead of paper.

   Colours come from --nav-bg / --nav-ink / --nav-muted, so a page
   with a different background tunes the bar without forking it.

   Light DOM on purpose: the homepage scroll-spy in main.js reaches
   in for #siteNav and .navlink, and a shadow root would hide them.
------------------------------------------------------------- */
(() => {
  "use strict";

  const LINKS = [
    { key: "home",    label: "Home",    home: "#top",     away: "index.html" },
    { key: "work",    label: "Work",    home: "#work",    away: "index.html#work" },
    { key: "gallery", label: "Gallery", home: "gallery.html", away: "gallery.html" },
    { key: "resume",  label: "Resume",  home: "resume.html",  away: "resume.html" },
    { key: "contact", label: "Contact", home: "#contact", away: "index.html#contact" },
  ];

  class SiteNav extends HTMLElement {
    connectedCallback() {
      if (this.dataset.ready) return; // moving the node must not rebuild it
      this.dataset.ready = "1";

      const current = this.getAttribute("current") || "home";
      const onHome = current === "home" || current === "work" || current === "contact";

      const links = LINKS.map((l) => {
        const href = onHome ? l.home : l.away;
        const on = l.key === current;
        // gallery and resume are always their own pages, so they are only
        // ever "current", never an anchor on the page you are already on
        return (
          '<a class="navlink" data-nav="' + l.key + '" href="' + href + '"' +
          (on ? ' aria-current="page"' : "") + ">" +
          l.label + '<span class="navbar"></span></a>'
        );
      }).join("");

      this.innerHTML =
        '<nav class="sitenav" aria-label="Primary">' +
          '<a class="mark" href="' + (onHome ? "#top" : "index.html") + '">naina.</a>' +
          '<div class="navlinks" id="siteNav">' + links + "</div>" +
        "</nav>";
    }
  }

  customElements.define("site-nav", SiteNav);
})();
