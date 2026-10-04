(() => {
  "use strict";

  // ── generic style-hover runtime (replaces design-tool's style-hover attr) ──
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

  // Below this width the 1440x900 hero stage is replaced by the stacked
  // layout built in initMobileHero(). Keep in sync with responsive.css.
  const MOBILE_Q = "(max-width: 760px)";
  const isMobile = () => window.matchMedia(MOBILE_Q).matches;

  // ── hero stage scaling ──
  function initStageFit() {
    const wrap = document.getElementById("wrapRef");
    const stage = document.getElementById("stageRef");
    if (!wrap || !stage) return;
    const fitStage = () => {
      // On mobile the stage is display:none and #mobileHero owns the
      // height, so stop forcing a 900*scale height onto the wrapper.
      if (isMobile()) {
        wrap.style.height = "";
        return;
      }
      const scale = Math.min(1.2, wrap.clientWidth / 1200);
      stage.style.transform = "scale(" + scale + ")";
      wrap.style.height = 900 * scale + "px";
    };
    fitStage();
    window.addEventListener("resize", fitStage);
    setInterval(fitStage, 500);
  }

  // ── mobile hero ──
  // The stage positions everything absolutely inside 1440x900, which can
  // only be fitted to a phone by scaling it to ~31% — illegible. Instead
  // the real prop nodes are moved into a stacked column and each is
  // scaled up to the column width. Moving (not cloning) the nodes means
  // the radio, notepad and folder handlers keep working untouched.
  function initMobileHero() {
    const wrap = document.getElementById("wrapRef");
    const stage = document.getElementById("stageRef");
    if (!wrap || !stage) return;

    /* [selector, native width, native height, width to render at on a phone]
       The props are scattered around the headline rather than stacked under
       it, each small enough to read as an accent — about three per cent of
       a 375x812 screen — so the headline is what the page opens on. */
    const PROPS = [
      ["#radioCard",  232.4, 147.9, 116],
      [".site-card",  196.6, 138.8, 104],
      ["#tidyZone",   210,   205,   100],
      ["#folderZone", 124,   116,    88],
      ["#wordleCard", 143,   196,    74]
    ];

    let host = null;
    let slots = [];
    // Every node we relocate, with where it came from, so the move is
    // fully reversible. All hero props are position:absolute inside the
    // stage, so restoring them is just appendChild back to that parent —
    // DOM order doesn't affect their rendering.
    let moved = [];
    const relocate = (node, target) => {
      moved.push({ node: node, parent: node.parentNode });
      target.appendChild(node);
    };

    const build = () => {
      if (host) return;
      host = document.createElement("div");
      host.id = "mobileHero";

      const eyebrow = document.getElementById("heroEyebrow");
      if (eyebrow) {
        eyebrow.classList.add("mh-eyebrow");
        relocate(eyebrow, host);
      }

      // the five headline slabs, in stage reading order
      const head = document.createElement("div");
      head.className = "mh-head";
      stage.querySelectorAll("[data-knockout]").forEach((el) => relocate(el, head));
      host.appendChild(head);

      const props = document.createElement("div");
      props.className = "mh-props";
      PROPS.forEach(([sel, w, h, mw], i) => {
        const node = stage.querySelector(sel) || document.querySelector(sel);
        if (!node) return;
        const slot = document.createElement("div");
        slot.className = "mh-slot";
        slot.dataset.prop = String(i + 1);      // the scatter position is CSS's job
        const box = document.createElement("div");
        box.className = "mh-box";
        box.style.width = w + "px";
        box.style.height = h + "px";
        relocate(node, box);
        slot.appendChild(box);
        props.appendChild(slot);
        slots.push({ slot: slot, box: box, w: w, h: h, mw: mw });
      });
      host.appendChild(props);

      const cta = document.createElement("div");
      cta.className = "mh-cta";
      const viewWork = document.getElementById("heroCta");
      const findMe = stage.querySelector(".brut-search");
      if (viewWork) relocate(viewWork, cta);
      if (findMe) relocate(findMe, cta);
      if (cta.children.length) host.appendChild(cta);

      wrap.appendChild(host);
    };

    // Put every relocated node back where it came from, and drop the
    // mobile scaffold, so widening the viewport restores the real stage.
    const teardown = () => {
      if (!host) return;
      moved.forEach(({ node, parent }) => {
        if (node.id === "heroEyebrow") node.classList.remove("mh-eyebrow");
        if (parent) parent.appendChild(node);
      });
      moved = [];
      slots = [];
      host.remove();
      host = null;
    };

    const layout = () => {
      if (!host) return;
      const vw = host.clientWidth;
      if (vw <= 0) return;
      // scale the target width with the screen so a 320px phone is not
      // handed the same prop as a 760px tablet
      const f = Math.max(0.82, Math.min(1.5, vw / 375));
      slots.forEach((s) => {
        const k = (s.mw * f) / s.w;
        s.box.style.transform = "scale(" + k + ")";
        s.slot.style.width = s.w * k + "px";
        s.slot.style.height = s.h * k + "px";
      });
    };

    const sync = () => {
      if (isMobile()) {
        build();
        layout();
      } else {
        teardown();
      }
    };

    sync();
    window.addEventListener("resize", sync);
  }

  // ── "tidy" sticky-note hover ──
  function initTidyHover() {
    const zone = document.getElementById("tidyZone");
    if (!zone) return;
    const padRef = document.getElementById("padRef");
    const badgeRef = document.getElementById("badgeRef");
    const box2Ref = document.getElementById("box2Ref");
    const box4Ref = document.getElementById("box4Ref");
    const tick2Ref = document.getElementById("tick2Ref");
    const tick4Ref = document.getElementById("tick4Ref");
    const rowsRef = document.getElementById("rowsRef");

    const setTidy = (on) => {
      if (padRef) padRef.style.transform = on ? "rotate(0deg)" : "rotate(-3deg)";
      if (badgeRef) {
        badgeRef.style.transform = on ? "rotate(4deg)" : "rotate(15deg)";
        badgeRef.style.background = on ? "#F9C846" : "#63E3C2";
      }
      [box2Ref, box4Ref].forEach((r) => { if (r) r.style.background = on ? "#C4E75A" : "#FAFAFA"; });
      [tick2Ref, tick4Ref].forEach((r) => { if (r) r.style.opacity = on ? "1" : "0"; });
      if (rowsRef) rowsRef.style.gap = on ? "9px" : "7.2px";
    };

    zone.addEventListener("mouseenter", () => setTidy(true));
    zone.addEventListener("mouseleave", () => setTidy(false));
  }

  // ── "experiments folder" hover ──
  function initFolderHover() {
    const zone = document.getElementById("folderZone");
    if (!zone) return;
    const sheets = [document.getElementById("sheet1Ref"), document.getElementById("sheet2Ref"), document.getElementById("sheet3Ref")];
    const labels = [document.getElementById("label1Ref"), document.getElementById("label2Ref"), document.getElementById("label3Ref")];
    const closedT = ["rotate(-8deg)", "rotate(-4.5deg)", "rotate(-1.5deg)"];
    const openT = ["translate(-7px,-42px) rotate(-13deg)", "translate(-2px,-27px) rotate(-7deg)", "translate(2px,-12px) rotate(-2deg)"];

    const setFolder = (open) => {
      sheets.forEach((el, i) => { if (el) el.style.transform = open ? openT[i] : closedT[i]; });
      labels.forEach((el) => { if (el) el.style.opacity = open ? "1" : "0"; });
    };

    zone.addEventListener("mouseenter", () => setFolder(true));
    zone.addEventListener("mouseleave", () => setFolder(false));
  }

  // ── journal book open/close ──
  function initJournal() {
    const book = document.getElementById("journalBook");
    if (!book) return;
    const cover = book.querySelector(".cover");
    const spread = book.querySelector(".spread");
    const tab = book.querySelector(".jrnl-tab");
    const collage = document.getElementById("likesCollage");

    const openBook = () => book.classList.add("open");
    const closeBook = (e) => { if (e) e.stopPropagation(); book.classList.remove("open"); };

    if (cover) {
      cover.addEventListener("click", openBook);
      // The cover says "Click to open", so it has to behave like a control:
      // reachable by keyboard and announced as a button, not a decorative div.
      cover.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openBook(); }
      });
    }
    /* On a phone the cover costs a tap before anything can be read, and
       a stray tap on the open spread closed it again. The book opens
       itself there and stays open; the covered state is a desktop
       flourish, where there is room for it. */
    const mqJ = window.matchMedia(MOBILE_Q);
    const syncBook = () => {
      if (mqJ.matches) book.classList.add("open");
    };
    syncBook();
    if (mqJ.addEventListener) mqJ.addEventListener("change", syncBook);

    if (spread) spread.addEventListener("click", (e) => { if (!mqJ.matches) closeBook(e); });
    if (tab) {
      tab.addEventListener("click", (e) => { if (!mqJ.matches) closeBook(e); });
      tab.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); closeBook(e); }
      });
    }
    if (collage) collage.addEventListener("click", (e) => e.stopPropagation());
  }

  // ── "avail discount" dodge-the-button coupon ──
  function initDodgeCoupon() {
    const zone = document.getElementById("dodgeZoneRef");
    const btn = document.getElementById("dodgeBtnRef");
    const caughtBox = document.getElementById("caughtRef");
    const winNote = document.getElementById("winNoteRef");
    const dismissBtn = document.getElementById("dismissBtn");
    if (!zone || !btn) return;

    /* Two jokes, one button. On a desktop it runs away from the cursor.
       A phone has no cursor to run from, so the click is the joke there:
       the button shrinks and asks you to try again, and keeps shrinking,
       until it gives up and tells you the coupon was never real. */
    let dodges = 0;
    let taps = 0;
    const GIVE_UP = 7;
    let tilt = 0;

    const paint = () => {
      const k = Math.pow(0.8, taps);
      btn.style.transformOrigin = "center center";
      btn.style.transform = "rotate(" + tilt.toFixed(1) + "deg) scale(" + k.toFixed(3) + ")";
    };

    const dodge = () => {
      dodges++;
      if (dodges >= 15) return;   // it stops running — they earned the click
      const maxX = Math.max(0, zone.clientWidth - btn.offsetWidth - 16);
      const maxY = Math.max(0, zone.clientHeight - btn.offsetHeight - 16);
      const cur = { x: parseFloat(btn.style.left) || 0, y: parseFloat(btn.style.top) || 0 };
      let x = 0, y = 0, tries = 0;
      do {
        x = 8 + Math.random() * maxX;
        y = 8 + Math.random() * maxY;
        tries++;
      } while (Math.hypot(x - cur.x, y - cur.y) < Math.min(maxX, maxY) * 0.6 && tries < 12);
      btn.style.left = x + "px";
      btn.style.top = y + "px";
      tilt = Math.random() * 10 - 5;
      paint();
    };

    const caught = () => {
      if (caughtBox) caughtBox.style.display = "flex";
      // the note is the button conceding, so it arrives with the popup
      if (winNote) winNote.style.opacity = "1";
    };
    const dismissCaught = () => {
      if (caughtBox) caughtBox.style.display = "none";
      taps = 0;                       // put the button back for the next visitor
      btn.textContent = LABEL;
      paint();
      // the note stays: it sits behind the popup, so closing the popup is
      // the first moment anyone can actually read it
    };

    const LABEL = btn.textContent.trim();
    const onTap = () => {
      taps++;
      if (taps >= GIVE_UP) { caught(); return; }
      btn.textContent = "Try once more \u2192";
      tilt = Math.random() * 12 - 6;
      paint();
    };

    btn.addEventListener("mouseenter", dodge);
    btn.addEventListener("click", onTap);
    if (dismissBtn) dismissBtn.addEventListener("click", dismissCaught);
  }

  /* ── the radio: one real track, played from YouTube ───────────
     Was a Web Audio synth inventing its own lo-fi. Now it plays the
     actual song through YouTube's embed, which is the licensed way
     to put someone else's music on a page.

     The iframe is created on the first click, not on load, so the
     page contacts YouTube only if a visitor actually asks for music
     — no third-party requests or cookies for everyone else.
  ------------------------------------------------------------- */
  function initRadio() {
    const playBtn = document.getElementById("playBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (!playBtn) return;

    const TRACK = {
      id: "IPfJnp1guPc",              // Khalid — Young Dumb & Broke (Official Video)
      name: "Young Dumb & Broke",
      artist: "Khalid",
      start: 20,                      // skip the intro and open on the hook
    };
    const SEEK = 15;                  // seconds the side buttons jump

    const nameEl = document.getElementById("trackName");
    const idxEl = document.getElementById("trackIdx");
    const wrap = document.getElementById("radioCard");
    if (idxEl) idxEl.textContent = TRACK.artist.toUpperCase();

    // Scroll the title only if it cannot fit. Measured rather than assumed,
    // because the panel is a fixed width and the font loads late.
    const fitTitle = () => {
      if (!nameEl) return;
      const copy = nameEl.querySelector(".cp");
      if (!copy) return;
      nameEl.classList.remove("scrolling");
      if (copy.getBoundingClientRect().width - 26 > nameEl.clientWidth + 0.5) {
        nameEl.classList.add("scrolling");
      }
    };
    fitTitle();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitTitle);
    window.addEventListener("resize", fitTitle);

    let player = null;       // the YT.Player once the API has loaded
    let ready = false;
    let wantPlay = false;    // a click that landed before the API was up

    const setIcon = (playing) => {
      playBtn.textContent = playing ? "❚❚" : "▶";
      if (wrap) wrap.classList.toggle("playing", playing);
    };

    // Load the IFrame API once, on demand.
    const loadApi = () => new Promise((resolve) => {
      if (window.YT && window.YT.Player) return resolve();
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (typeof prev === "function") prev(); resolve(); };
      if (!document.getElementById("ytApi")) {
        const tag = document.createElement("script");
        tag.id = "ytApi";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    });

    const build = async () => {
      await loadApi();
      const host = document.createElement("div");
      host.id = "ytHost";
      // audible, not visible: the radio itself is the interface
      host.style.cssText = "position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; left:-9999px; top:0;";
      document.body.appendChild(host);

      player = new window.YT.Player(host, {
        videoId: TRACK.id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, start: TRACK.start },
        events: {
          onReady: () => {
            ready = true;
            if (wantPlay) { player.playVideo(); wantPlay = false; }
          },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) setIcon(true);
            if (e.data === S.PAUSED || e.data === S.ENDED) setIcon(false);
          },
          onError: () => {
            // embedding can be refused (region, rights, blocked host) — say so
            // rather than leaving a dead button
            setIcon(false);
            const copies = nameEl ? nameEl.querySelectorAll(".cp") : [];
            copies.forEach((c) => { c.textContent = "Play on YouTube Music"; });
            if (idxEl) idxEl.textContent = "COULDN'T PLAY HERE";
            fitTitle();
          },
        },
      });
    };

    playBtn.addEventListener("click", () => {
      if (!player) { wantPlay = true; setIcon(true); build(); return; }
      if (!ready) { wantPlay = true; return; }
      const S = window.YT.PlayerState;
      if (player.getPlayerState() === S.PLAYING) { player.pauseVideo(); return; }
      // `start` only applies on load, so a replay after the track ends has
      // to be sent back to the hook explicitly
      if (player.getPlayerState() === S.ENDED) player.seekTo(TRACK.start, true);
      player.playVideo();
    });

    // one track, so the side buttons scrub instead of changing song
    const nudge = (dir) => {
      if (!player || !ready) return;
      const t = player.getCurrentTime() + dir * SEEK;
      player.seekTo(Math.max(0, t), true);
    };
    if (prevBtn) {
      prevBtn.setAttribute("aria-label", "Back " + SEEK + " seconds");
      prevBtn.addEventListener("click", () => nudge(-1));
    }
    if (nextBtn) {
      nextBtn.setAttribute("aria-label", "Forward " + SEEK + " seconds");
      nextBtn.addEventListener("click", () => nudge(1));
    }
    playBtn.setAttribute("aria-label", "Play " + TRACK.name + " by " + TRACK.artist);
  }


  /* ── the work cards, as a deck you shuffle ─────────────────
     A column of three cards on a phone is three screens of scrolling
     past things you have already decided about. Stacked, it is one
     card at a time and a swipe to see the next — and the deck is a
     loop, so the card you flick away goes to the bottom rather than
     being gone.

     Swiping sideways must not fight scrolling down the page, so the
     cards declare touch-action: pan-y and a gesture only becomes a
     swipe once it is clearly more horizontal than vertical. A drag
     also has to not count as a tap, or every shuffle would open a
     case study.

     The desktop grid is untouched: this only runs under the mobile
     query and puts everything back when the window grows.
  ---------------------------------------------------------- */
  function initCardDeck() {
    const grid = document.getElementById("projects");
    if (!grid) return;
    const cards = Array.from(grid.querySelectorAll(".proj-card"));
    if (cards.length < 2) return;

    const TILT = [-4.5, 2.8, -1.6];      // the stack is dropped, not filed
    const THROW = 420;                   // how far a discarded card flies
    const COMMIT = 72;                   // px of drag that counts as a swipe
    let stage = null, dots = null, hint = null;
    let order = cards.map((_, i) => i);
    let drag = null, moved = 0, busy = false;

    const place = (card, pos, dx, lift) => {
      // pos 0 is the top card, 1 is the one under it, and so on
      const t = TILT[pos % TILT.length];
      const off = dx || 0;
      const rot = t + (off / 26);
      card.style.zIndex = String(40 - pos);
      card.style.opacity = pos > 2 ? "0" : "1";
      card.style.transform =
        "translate3d(" + off.toFixed(1) + "px," + (pos * 14 - (lift || 0)) + "px,0)" +
        " rotate(" + rot.toFixed(2) + "deg)" +
        " scale(" + (1 - pos * 0.05).toFixed(3) + ")";
    };

    const render = (animate) => {
      order.forEach((idx, pos) => {
        const c = cards[idx];
        c.style.transition = animate ? "transform .42s cubic-bezier(.22,.9,.3,1), opacity .3s ease" : "none";
        place(c, pos, 0, 0);
      });
      if (dots) {
        Array.from(dots.children).forEach((el, i) => el.classList.toggle("on", i === order[0]));
      }
    };

    const shuffle = (dir) => {
      if (busy) return;
      busy = true;
      const top = cards[order[0]];
      top.style.transition = "transform .34s ease-in, opacity .34s ease-in";
      top.style.transform =
        "translate3d(" + (dir * THROW) + "px,-30px,0) rotate(" + (dir * 22) + "deg) scale(.92)";
      top.style.opacity = "0";
      window.setTimeout(() => {
        order.push(order.shift());            // the thrown card goes to the bottom
        top.style.transition = "none";
        place(top, order.length - 1, 0, 0);
        top.style.opacity = "0";
        // A timer, not requestAnimationFrame: rAF does not run while the
        // tab is not painting, and clearing the busy flag inside one left
        // the deck locked for good if a swipe landed as the page was
        // backgrounded. Timers still fire there.
        window.setTimeout(() => { render(true); busy = false; }, 24);
      }, 340);
    };

    const onDown = (e) => {
      if (busy) return;
      // Hit-test the top card's box rather than asking whether the event
      // landed on one of its descendants: the stage is taller than the
      // card, and a finger near an edge can report the stage itself.
      const card = cards[order[0]];
      const r = card.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right ||
          e.clientY < r.top || e.clientY > r.bottom) return;
      drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
      moved = 0;
      card.style.transition = "none";   // follow the finger, don't ease after it
    };
    const onMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) { drag = null; render(true); return; }
      moved = Math.abs(dx);
      place(cards[order[0]], 0, dx, Math.min(16, moved / 8));
    };
    const onUp = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      drag = null;
      if (Math.abs(dx) >= COMMIT) shuffle(dx < 0 ? -1 : 1);
      else render(true);
    };

    // a drag is not a tap: stop the shuffle from opening a case study
    const onClick = (e) => { if (moved > 10) { e.preventDefault(); e.stopPropagation(); moved = 0; } };

    const build = () => {
      if (stage) return;
      stage = document.createElement("div");
      stage.className = "deck-stage";
      cards.forEach((c) => stage.appendChild(c));

      hint = document.createElement("p");
      hint.className = "deck-hint";
      hint.textContent = "swipe to shuffle";
      dots = document.createElement("div");
      dots.className = "deck-count";
      cards.forEach(() => dots.appendChild(document.createElement("i")));
      stage.appendChild(hint);
      stage.appendChild(dots);
      grid.appendChild(stage);
      grid.classList.add("deck");
      grid.classList.add("spread-in");     // the deck owns the transforms now

      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerup", onUp);
      stage.addEventListener("pointercancel", onUp);
      stage.addEventListener("click", onClick, true);
      measure();
      render(false);
    };

    const measure = () => {
      if (!stage) return;
      const h = cards[order[0]].offsetHeight;
      if (h) stage.style.height = h + 58 + "px";
    };

    const teardown = () => {
      if (!stage) return;
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("click", onClick, true);
      order = cards.map((_, i) => i);
      cards.forEach((c) => {
        c.style.transform = ""; c.style.opacity = ""; c.style.zIndex = ""; c.style.transition = "";
        grid.appendChild(c);
      });
      stage.remove(); stage = null; dots = null; hint = null;
      grid.classList.remove("deck");
    };

    const sync = () => { if (isMobile()) build(); else teardown(); };

    sync();
    window.addEventListener("resize", () => { sync(); measure(); });
  }

  // ── skills word-search game + floating pixel repel ──
  function initSkillsGame() {
    const skills = document.getElementById("skills");
    if (!skills) return;
    const grid = document.getElementById("wsGrid");
    const hint = document.getElementById("wsHint");

    /* ── two grids, one game ───────────────────────────────────
       Fifteen columns need 650px. On a phone that forces 19px cells,
       which is a picture of a word search rather than one you can
       trace with a finger. The phone gets its own grid instead —
       nine columns and eighteen rows, so the cells can be big — and
       the long words run down it rather than across. Same eight
       skills either way.
    ---------------------------------------------------------- */
    const COLOURS = { ux: "#63E3C2", ia: "#FF7EB6", proto: "#C4E75A",
                      design: "#F9C846", access: "#A66BFF", flows: "#3355FF",
                      motion: "#2BD97C", brand: "#FF6B5B" };

    const WIDE = {
      note: "Find these eight \u2014 five across, three down",
      // the letters already in the markup; read once, below
      letters: null,
      words: [
        { id: "ux",     r0: 0,  c0: 2,  r1: 0,  c1: 11 }, // UX RESEARCH
        { id: "ia",     r0: 3,  c0: 3,  r1: 3,  c1: 14 }, // ARCHITECTURE
        { id: "proto",  r0: 5,  c0: 4,  r1: 5,  c1: 14 }, // PROTOTYPING
        { id: "design", r0: 8,  c0: 0,  r1: 8,  c1: 12 }, // DESIGN SYSTEMS
        { id: "access", r0: 10, c0: 2,  r1: 10, c1: 14 }, // ACCESSIBILITY
        { id: "flows",  r0: 0,  c0: 2,  r1: 8,  c1: 2  }, // USER FLOWS
        { id: "motion", r0: 1,  c0: 8,  r1: 6,  c1: 8  }, // MOTION
        { id: "brand",  r0: 2,  c0: 13, r1: 9,  c1: 13 }, // BRANDING
      ],
    };

    const TALL = {
      note: "Find these eight \u2014 five across, three down",
      letters: ["DPROTOTYPING","EZUSERFLOWSI","SAUXRESEARCH","ICKGBRANDING",
                "GCHGDJRPRTHE","NERUVQCAIAPF","SSZGQMHFKKDC","YSRMOTIONYIR",
                "SIPGHGTCCGWR","TBOTWRECDZWX","EIGXKCCDSOCZ","MLZRDITOUYRD",
                "SILQBYUMYSTQ","HTHSPMRXEYZM","AYBBPUEBXLYN"],
      words: [
        { id: "ux",     r0: 2,  c0: 2,  r1: 2,  c1: 11 }, // UX RESEARCH
        { id: "flows",  r0: 1,  c0: 2,  r1: 1,  c1: 10 }, // USER FLOWS
        { id: "proto",  r0: 0,  c0: 1,  r1: 0,  c1: 11 }, // PROTOTYPING
        { id: "brand",  r0: 3,  c0: 4,  r1: 3,  c1: 11 }, // BRANDING
        { id: "motion", r0: 7,  c0: 3,  r1: 7,  c1: 8  }, // MOTION
        { id: "design", r0: 0,  c0: 0,  r1: 12, c1: 0  }, // DESIGN SYSTEMS
        { id: "access", r0: 2,  c0: 1,  r1: 14, c1: 1  }, // ACCESSIBILITY
        { id: "ia",     r0: 3,  c0: 6,  r1: 14, c1: 6  }, // ARCHITECTURE
      ],
    };

    // keep the markup's own letters as the wide layout
    if (grid) {
      WIDE.letters = [...grid.children].map((row) =>
        [...row.children].map((c) => c.textContent).join(""));
    }

    let rowEls = [];
    let WORDS = [];
    const cellAt = (r, c) => rowEls[r] && rowEls[r].children[c];

    const mount = (layout) => {
      if (!grid) return;
      grid.innerHTML = layout.letters.map((line) =>
        '<div style="display:flex; gap:10px;">' +
        [...line].map((ch) => '<span class="wc">' + ch + "</span>").join("") +
        "</div>").join("");
      rowEls = [...grid.children];
      rowEls.forEach((row, r) =>
        [...row.children].forEach((cell, c) => { cell._r = r; cell._c = c; }));
      WORDS = layout.words.map((w) => Object.assign({}, w, {
        color: COLOURS[w.id],
        down: w.c0 === w.c1 && w.r0 !== w.r1,
      }));
      if (hint) hint.textContent = layout.note;
    };

    mount(isMobile() ? TALL : WIDE);
    // every cell a word covers, in order
    const cellsOf = (w) => {
      const out = [];
      const n = w.down ? w.r1 - w.r0 : w.c1 - w.c0;
      for (let i = 0; i <= n; i++) {
        const cell = w.down ? cellAt(w.r0 + i, w.c0) : cellAt(w.r0, w.c0 + i);
        if (cell) out.push(cell);
      }
      return out;
    };
    const found = new Set();
    let selecting = false, startCell = null, curSel = [];
    let hintT, idleT;

    /* ── the clock ────────────────────────────────────────────
       Counts up from the first drag rather than from arrival, so
       reading the eight words through costs nothing, and someone
       who scrolls past and comes back is not already losing.
    ---------------------------------------------------------- */
    const timeEl = document.getElementById("wsTime");
    const foundEl = document.getElementById("wsFound");
    const barEl = document.getElementById("wsBar");
    const hudEl = document.getElementById("wsHud");
    const clockEl = hudEl && hudEl.querySelector(".ws-clock");
    let startedAt = 0, elapsed = 0, tick = 0, hints = 0;

    const mmss = (ms) => {
      const t = Math.floor(ms / 1000);
      return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
    };
    const paintClock = () => {
      if (timeEl) timeEl.textContent = mmss(elapsed);
    };
    const startClock = () => {
      if (startedAt || found.size === WORDS.length) return;
      startedAt = Date.now();
      if (clockEl) clockEl.classList.add("running");
      tick = setInterval(() => { elapsed = Date.now() - startedAt; paintClock(); }, 250);
    };
    const stopClock = () => {
      if (tick) { clearInterval(tick); tick = 0; }
      if (startedAt) elapsed = Date.now() - startedAt;
      startedAt = 0;
      if (clockEl) clockEl.classList.remove("running");
      paintClock();
    };

    const scoreboard = () => {
      if (foundEl) foundEl.textContent = found.size;
      if (barEl) barEl.style.width = Math.round((found.size / WORDS.length) * 100) + "%";
      if (found.size < WORDS.length) return;
      stopClock();
      if (hudEl) hudEl.classList.add("done");
      showWin();
    };

    const clearSel = () => { curSel.forEach((c) => c.classList.remove("sel")); curSel = []; };
    const paintSel = (cells) => {
      clearSel();
      cells.forEach((cell) => { if (cell) { cell.classList.add("sel"); curSel.push(cell); } });
    };
    const runBetween = (a, b) => {
      const out = [];
      if (a._r === b._r) {
        for (let c = Math.min(a._c, b._c); c <= Math.max(a._c, b._c); c++) out.push(cellAt(a._r, c));
      } else if (a._c === b._c) {
        for (let r = Math.min(a._r, b._r); r <= Math.max(a._r, b._r); r++) out.push(cellAt(r, a._c));
      }
      return out;
    };
    const drawPill = (w) => {
      const a = cellAt(w.r0, w.c0), b = cellAt(w.r1, w.c1);
      if (!a || !b) return;
      const pad = 3;
      const pill = document.createElement("div");
      pill.className = "word-pill";
      pill.style.left = a.offsetLeft - pad + "px";
      pill.style.top = a.offsetTop - pad + "px";
      pill.style.width = b.offsetLeft + b.offsetWidth - a.offsetLeft + pad * 2 + "px";
      pill.style.height = b.offsetTop + b.offsetHeight - a.offsetTop + pad * 2 + "px";
      pill.style.borderColor = w.color;
      pill.style.background = w.color + "2E";
      grid.appendChild(pill);
      cellsOf(w).forEach((cell) => cell.classList.add("found"));
      const chip = skills.querySelector('.word-chip[data-chip="' + w.id + '"]');
      if (chip) chip.classList.add("done");
      scoreboard();
    };

    const beginSel = (cell) => {
      selecting = true; startCell = cell; paintSel([cell]);
      startClock();
    };
    const extendSel = (cell) => {
      if (!selecting || !cell || !startCell) return;
      // a drag is only a word if it stays on one row or one column
      if (cell._r !== startCell._r && cell._c !== startCell._c) return;
      paintSel(runBetween(startCell, cell));
    };

    if (grid) {
      grid.addEventListener("mousedown", (e) => {
        const cell = e.target.closest(".wc"); if (!cell) return;
        beginSel(cell);
        e.preventDefault();
      });
      grid.addEventListener("mouseover", (e) => {
        const cell = e.target.closest(".wc");
        if (cell) extendSel(cell);
      });

      // Touch: a finger fires no mouseover, and the touchmove target stays
      // the element the gesture started on — so the cell under the finger
      // has to be resolved by hit-testing each move.
      const cellFromTouch = (t) => {
        const el = document.elementFromPoint(t.clientX, t.clientY);
        return el ? el.closest(".wc") : null;
      };
      grid.addEventListener("touchstart", (e) => {
        const cell = cellFromTouch(e.touches[0]); if (!cell) return;
        beginSel(cell);
        // stop the drag from scrolling the page while tracing a word
        e.preventDefault();
      }, { passive: false });
      grid.addEventListener("touchmove", (e) => {
        if (!selecting) return;
        extendSel(cellFromTouch(e.touches[0]));
        e.preventDefault();
      }, { passive: false });
      grid.addEventListener("touchend", () => onSkillUp());
      grid.addEventListener("touchcancel", () => onSkillUp());
    }

    const clearHints = () => {
      if (!grid) return;
      grid.querySelectorAll(".wc.hint").forEach((c) => c.classList.remove("hint"));
      grid.querySelectorAll(".hint-arrow").forEach((a) => a.remove());
    };
    const drawArrow = (w) => {
      const a = cellAt(w.r0, w.c0); if (!a || !grid) return;
      const box = document.createElement("div");
      box.className = "hint-arrow";
      box.style.left = a.offsetLeft + a.offsetWidth / 2 - 5 + "px";
      box.style.top = a.offsetTop + a.offsetHeight - 9 + "px";
      // the chevron is drawn pointing right; rotate it for a down word
      box.style.transform = w.down ? "rotate(90deg)" : "";
      box.innerHTML =
        '<svg width="10" height="8" viewBox="0 0 10 8">' +
        '<path d="M2 1.5 L6.5 4 L2 6.5" fill="none" stroke="' + w.color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        "</svg>";
      grid.appendChild(box);
    };
    const hintWord = (w, full) => {
      clearHints();
      const cells = cellsOf(w);
      (full ? cells : cells.slice(0, 1)).forEach((cell) => cell.classList.add("hint"));
      drawArrow(w);
      clearTimeout(hintT);
      hintT = setTimeout(clearHints, full ? 3600 : 5200);
    };

    const onSkillUp = () => {
      if (!selecting) return; selecting = false;
      if (curSel.length >= 2) {
        const vertical = curSel[0]._c === curSel[1]._c;
        // how much of the drag lies along the word, in whichever axis it runs
        const overlap = (w) => {
          if (!!w.down !== vertical) return 0;
          const vals = curSel.map((c) => (vertical ? c._r : c._c));
          const mn = Math.min(...vals), mx = Math.max(...vals);
          const a = vertical ? w.r0 : w.c0, b = vertical ? w.r1 : w.c1;
          const fixed = vertical ? w.c0 : w.r0;
          if ((vertical ? curSel[0]._c : curSel[0]._r) !== fixed) return 0;
          return Math.min(mx, b) - Math.max(mn, a) + 1;
        };
        const hit = WORDS.filter((w) => !found.has(w.id))
          .map((w) => ({ w, hit: overlap(w) }))
          .filter((o) => o.hit >= 2)
          .sort((a, b) => b.hit - a.hit)[0];
        if (hit) { found.add(hit.w.id); clearSel(); clearHints(); drawPill(hit.w); return; }
      }
      clearSel();
    };
    window.addEventListener("mouseup", onSkillUp);

    skills.querySelectorAll(".word-chip").forEach((chip) => {
      const show = () => {
        const w = WORDS.find((w) => w.id === chip.dataset.chip);
        if (!w || found.has(w.id)) return null;
        hintWord(w, true);
        return w;
      };
      // Hovering a chip is browsing; clicking it is asking. Only the
      // asking is counted, or a mouse crossing the row would run up a
      // score nobody chose.
      chip.addEventListener("mouseenter", show);
      chip.addEventListener("click", () => {
        if (show()) { startClock(); hints++; }
      });
      chip.addEventListener("mouseleave", () => { clearTimeout(hintT); clearHints(); });
    });

    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            clearTimeout(idleT);
            idleT = setTimeout(() => {
              const w = WORDS.find((w) => !found.has(w.id));
              if (w) hintWord(w, false);
            }, 3000);
          } else {
            clearTimeout(idleT); clearHints();
          }
        });
      }, { threshold: 0.35 });
      io.observe(skills);
    }

    /* ── the scoreboard ───────────────────────────────────────
       Eight out of eight is the only thing on this page that can be
       won, so it gets a proper finish rather than a quiet last pill.
    ---------------------------------------------------------- */
    const winBox = document.getElementById("wsWin");
    const CONFETTI = ["#F9C846", "#63E3C2", "#FF7EB6", "#C4E75A", "#A66BFF", "#FF6B5B"];

    const throwConfetti = () => {
      const host = document.getElementById("wsConfetti");
      if (!host || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      host.innerHTML = "";
      for (let i = 0; i < 26; i++) {
        const bit = document.createElement("i");
        bit.style.left = (Math.random() * 100).toFixed(1) + "%";
        bit.style.background = CONFETTI[i % CONFETTI.length];
        bit.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
        bit.style.transform = "rotate(" + Math.round(Math.random() * 360) + "deg)";
        host.appendChild(bit);
      }
    };

    let lastFocus = null;
    const showWin = () => {
      if (!winBox) return;
      const t = document.getElementById("wsScoreTime");
      const h = document.getElementById("wsScoreHints");
      if (t) t.textContent = mmss(elapsed);
      if (h) h.textContent = hints;
      lastFocus = document.activeElement;
      winBox.hidden = false;
      throwConfetti();
      const go = document.getElementById("wsAgain");
      if (go) go.focus();
    };

    const hideWin = () => {
      if (!winBox || winBox.hidden) return;
      winBox.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    const resetGame = () => {
      hideWin();
      found.clear();
      clearSel();
      clearHints();
      stopClock();
      elapsed = 0; hints = 0;
      paintClock();
      if (hudEl) hudEl.classList.remove("done");
      if (grid) {
        grid.querySelectorAll(".word-pill").forEach((pill) => pill.remove());
        grid.querySelectorAll(".wc.found").forEach((cell) => cell.classList.remove("found"));
      }
      skills.querySelectorAll(".word-chip.done").forEach((chip) => chip.classList.remove("done"));
      scoreboard();
    };

    if (winBox) {
      const again = document.getElementById("wsAgain");
      const shut = document.getElementById("wsClose");
      if (again) again.addEventListener("click", resetGame);
      if (shut) shut.addEventListener("click", hideWin);
      // the backdrop closes, the card does not
      winBox.addEventListener("click", (e) => { if (e.target === winBox) hideWin(); });
      document.addEventListener("keydown", (e) => {
        if (!winBox.hidden && e.key === "Escape") hideWin();
      });
    }

    /* Crossing the breakpoint swaps the grid underneath the player, so
       the round has to start again — there is no sensible way to carry
       a half-traced word from a 15-column grid into a 9-column one. */
    const mq = window.matchMedia(MOBILE_Q);
    let wasMobile = mq.matches;
    const onBreakpoint = () => {
      if (mq.matches === wasMobile) return;
      wasMobile = mq.matches;
      mount(wasMobile ? TALL : WIDE);
      resetGame();
    };
    if (mq.addEventListener) mq.addEventListener("change", onBreakpoint);
    else window.addEventListener("resize", onBreakpoint);

    paintClock();
    scoreboard();

    const floats = skills.querySelectorAll(".pixel-float");
    window.addEventListener("mousemove", (e) => {
      const R = 130;
      floats.forEach((f) => {
        const r = f.getBoundingClientRect();
        const dx = r.left + r.width / 2 - e.clientX;
        const dy = r.top + r.height / 2 - e.clientY;
        const d = Math.hypot(dx, dy) || 1;
        if (d < R) {
          const force = (1 - d / R) * 24;
          f.style.transform = "translate(" + ((dx / d) * force).toFixed(1) + "px," + ((dy / d) * force).toFixed(1) + "px)";
        } else {
          f.style.transform = "translate(0px,0px)";
        }
      });
    });
  }

  // ── nav ──────────────────────────────────────────────────
  // The bar now carries only whole-page destinations, so there is no
  // in-page section for a scroll position to light up. <site-nav>
  // marks the current page itself and nothing here has to track it.

  document.addEventListener("DOMContentLoaded", () => {
    initHoverStyles();
    initMobileHero();
    initStageFit();
    initTidyHover();
    initFolderHover();
    initJournal();
    initDodgeCoupon();
    initRadio();
    initCardDeck();
    initSkillsGame();
  });
})();
