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

    // [selector, native width, native height, full-width?]
    const PROPS = [
      ["#radioCard", 232.4, 147.9, true],
      [".site-card", 196.6, 138.8, true],
      ["#tidyZone", 210, 205, true],
      ["#folderZone", 124, 116, false],
      ["#wordleCard", 143, 196, false]
    ];
    const MAX_SCALE = 1.9;

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
      let row = null;
      PROPS.forEach(([sel, w, h, full]) => {
        const node = stage.querySelector(sel) || document.querySelector(sel);
        if (!node) return;
        const slot = document.createElement("div");
        slot.className = "mh-slot";
        const box = document.createElement("div");
        box.className = "mh-box";
        box.style.width = w + "px";
        box.style.height = h + "px";
        relocate(node, box);
        slot.appendChild(box);
        if (full) {
          props.appendChild(slot);
          row = null;
        } else {
          if (!row) {
            row = document.createElement("div");
            row.className = "mh-row";
            props.appendChild(row);
          }
          row.appendChild(slot);
        }
        slots.push({ slot: slot, box: box, w: w, h: h, full: full });
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
      const cs = window.getComputedStyle(host);
      const avail =
        host.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (avail <= 0) return;
      slots.forEach((s) => {
        const target = s.full ? avail : (avail - 14) / 2;
        const k = Math.min(MAX_SCALE, target / s.w);
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
    if (spread) spread.addEventListener("click", closeBook);
    if (tab) {
      tab.addEventListener("click", closeBook);
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

    let dodges = 0;
    const dodge = () => {
      dodges++;
      if (dodges >= 15) {
        if (winNote) winNote.style.opacity = "1";
        return; // it stops running — they earned the click
      }
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
      btn.style.transform = "rotate(" + (Math.random() * 10 - 5).toFixed(1) + "deg)";
    };

    const caught = () => { if (caughtBox) caughtBox.style.display = "flex"; };
    const dismissCaught = () => { if (caughtBox) caughtBox.style.display = "none"; };

    btn.addEventListener("mouseenter", dodge);
    btn.addEventListener("click", caught);
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


  // ── skills word-search game + floating pixel repel ──
  function initSkillsGame() {
    const skills = document.getElementById("skills");
    if (!skills) return;
    const grid = document.getElementById("wsGrid");
    const rowEls = grid ? [...grid.children] : [];
    const cellAt = (r, c) => rowEls[r] && rowEls[r].children[c];
    rowEls.forEach((row, r) => [...row.children].forEach((cell, c) => { cell._r = r; cell._c = c; }));

    // Each word is a straight run between two cells. `dir` is derived, so a
    // new word only needs its two endpoints and they must share a row or a
    // column. Keep these in step with the letters in index.html.
    const WORDS = [
      { id: "ux",     color: "#63E3C2", r0: 0,  c0: 2,  r1: 0,  c1: 11 }, // UX RESEARCH
      { id: "ia",     color: "#FF7EB6", r0: 3,  c0: 3,  r1: 3,  c1: 14 }, // ARCHITECTURE
      { id: "proto",  color: "#C4E75A", r0: 5,  c0: 4,  r1: 5,  c1: 14 }, // PROTOTYPING
      { id: "design", color: "#F9C846", r0: 8,  c0: 0,  r1: 8,  c1: 12 }, // DESIGN SYSTEMS
      { id: "access", color: "#A66BFF", r0: 10, c0: 2,  r1: 10, c1: 14 }, // ACCESSIBILITY
      { id: "flows",  color: "#3355FF", r0: 0,  c0: 2,  r1: 8,  c1: 2  }, // USER FLOWS
      { id: "motion", color: "#2BD97C", r0: 1,  c0: 8,  r1: 6,  c1: 8  }, // MOTION
      { id: "brand",  color: "#FF6B5B", r0: 2,  c0: 13, r1: 9,  c1: 13 }, // BRANDING
    ];
    WORDS.forEach((w) => { w.down = w.c0 === w.c1 && w.r0 !== w.r1; });
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
    };

    const beginSel = (cell) => {
      selecting = true; startCell = cell; paintSel([cell]);
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
        if (w && !found.has(w.id)) hintWord(w, true);
      };
      chip.addEventListener("mouseenter", show);
      chip.addEventListener("click", show);
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
    initSkillsGame();
  });
})();
