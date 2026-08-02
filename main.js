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

    const build = () => {
      if (host) return;
      host = document.createElement("div");
      host.id = "mobileHero";

      const eyebrow = document.getElementById("heroEyebrow");
      if (eyebrow) {
        eyebrow.classList.add("mh-eyebrow");
        host.appendChild(eyebrow);
      }

      // the five headline slabs, in stage reading order
      const head = document.createElement("div");
      head.className = "mh-head";
      stage.querySelectorAll("[data-knockout]").forEach((el) => head.appendChild(el));
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
        box.appendChild(node);
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
      const viewWork = stage.querySelector('a[href="#work"]');
      const findMe = stage.querySelector(".brut-search");
      if (viewWork) cta.appendChild(viewWork);
      if (findMe) cta.appendChild(findMe);
      if (cta.children.length) host.appendChild(cta);

      wrap.appendChild(host);
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
      }
      // Deliberately one-way: a phone doesn't cross this breakpoint except
      // on rotation, and tearing the stage back down would mean restoring
      // every inline left/top we overrode. A desktop browser resized below
      // 760px gets the mobile hero until it reloads.
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

    if (cover) cover.addEventListener("click", openBook);
    if (spread) spread.addEventListener("click", closeBook);
    if (tab) tab.addEventListener("click", closeBook);
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

  // ── lo-fi radio ("Naina FM") — generative Web Audio synth engine ──
  function initRadio() {
    const playBtn = document.getElementById("playBtn");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");
    if (!playBtn) return;

    const C = [130.81, 164.81, 196.0, 246.94], Am = [110.0, 130.81, 164.81, 196.0],
      Dm = [146.83, 174.61, 220.0, 261.63], G = [98.0, 123.47, 146.83, 196.0],
      F = [174.61, 220.0, 261.63, 329.63], Em = [164.81, 196.0, 246.94, 293.66],
      Dmaj = [146.83, 185.0, 220.0, 277.18], Gmaj = [196.0, 246.94, 293.66, 392.0];

    const tracks = [
      { name: "chai & lofi", bpm: 72, chords: [C, Am, Dm, G] },
      { name: "figma flow", bpm: 82, chords: [F, Em, Dm, C] },
      { name: "rainy gurugram", bpm: 66, chords: [Am, F, C, G] },
      { name: "crochet calm", bpm: 60, chords: [Dmaj, Am, Gmaj, F] },
    ];

    const radio = { idx: 0, playing: false, actx: null, master: null, lp: null, crackleGain: null, noiseBuf: null, timer: null, step: 0, nextNoteTime: 0 };

    const updateDisplay = () => {
      const t = tracks[radio.idx];
      const n = document.getElementById("trackName"); if (n) n.textContent = t.name;
      const ix = document.getElementById("trackIdx"); if (ix) ix.textContent = "TRACK " + (radio.idx + 1) + " / " + tracks.length;
    };
    updateDisplay();

    const ensureAudio = () => {
      if (radio.actx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      const a = new AC(); radio.actx = a;
      radio.master = a.createGain(); radio.master.gain.value = 0.0001;
      radio.lp = a.createBiquadFilter(); radio.lp.type = "lowpass"; radio.lp.frequency.value = 2600; radio.lp.Q.value = 0.4;
      radio.lp.connect(radio.master); radio.master.connect(a.destination);
      const n = a.createBuffer(1, a.sampleRate, a.sampleRate); const d = n.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      radio.noiseBuf = n;
      const cs = a.createBufferSource(); cs.buffer = n; cs.loop = true;
      const cf = a.createBiquadFilter(); cf.type = "bandpass"; cf.frequency.value = 3200;
      radio.crackleGain = a.createGain(); radio.crackleGain.gain.value = 0.0001;
      cs.connect(cf); cf.connect(radio.crackleGain); radio.crackleGain.connect(a.destination);
      cs.start();
    };

    const playChord = (freqs, t, dur) => {
      freqs.forEach((f) => {
        const o = radio.actx.createOscillator(); o.type = "triangle"; o.frequency.value = f;
        const g = radio.actx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.045, t + 0.5);
        g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(radio.lp); o.start(t); o.stop(t + dur + 0.05);
      });
    };
    const playPluck = (f, t) => {
      const o = radio.actx.createOscillator(); o.type = "sine"; o.frequency.value = f;
      const g = radio.actx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g); g.connect(radio.lp); o.start(t); o.stop(t + 0.55);
    };
    const playKick = (t) => {
      const o = radio.actx.createOscillator(); o.type = "sine";
      const g = radio.actx.createGain();
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.3, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      o.connect(g); g.connect(radio.master); o.start(t); o.stop(t + 0.2);
    };
    const playHat = (t) => {
      const s = radio.actx.createBufferSource(); s.buffer = radio.noiseBuf;
      const hp = radio.actx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
      const g = radio.actx.createGain();
      g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      s.connect(hp); hp.connect(g); g.connect(radio.master); s.start(t); s.stop(t + 0.07);
    };

    const scheduleStep = (step, t) => {
      const tr = tracks[radio.idx]; const chords = tr.chords; const bl = 8;
      const bar = Math.floor(step / bl) % chords.length; const inBar = step % bl;
      const chord = chords[bar]; const eighth = 60 / tr.bpm / 2;
      if (inBar === 0) playChord(chord, t, eighth * bl * 0.95);
      if (inBar % 4 === 0) playKick(t);
      if (inBar % 2 === 1) playHat(t);
      if (inBar === 0 || inBar === 3 || inBar === 4 || inBar === 6) playPluck(chord[step % chord.length] * 2, t);
    };

    const scheduler = () => {
      const a = radio.actx;
      while (radio.nextNoteTime < a.currentTime + 0.15) {
        scheduleStep(radio.step, radio.nextNoteTime);
        const t = tracks[radio.idx]; const eighth = 60 / t.bpm / 2;
        radio.nextNoteTime += eighth; radio.step++;
      }
    };

    const startEngine = () => {
      const a = radio.actx; if (a.state === "suspended") a.resume();
      radio.master.gain.cancelScheduledValues(a.currentTime);
      radio.master.gain.setValueAtTime(Math.max(0.0001, radio.master.gain.value), a.currentTime);
      radio.master.gain.linearRampToValueAtTime(0.8, a.currentTime + 0.6);
      radio.crackleGain.gain.linearRampToValueAtTime(0.014, a.currentTime + 0.6);
      radio.step = 0;
      radio.nextNoteTime = a.currentTime + 0.15;
      clearInterval(radio.timer);
      radio.timer = setInterval(scheduler, 25);
    };
    const stopEngine = () => {
      clearInterval(radio.timer); radio.timer = null;
      if (radio.actx) {
        const a = radio.actx;
        radio.master.gain.cancelScheduledValues(a.currentTime);
        radio.master.gain.setValueAtTime(radio.master.gain.value, a.currentTime);
        radio.master.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.35);
        if (radio.crackleGain) radio.crackleGain.gain.linearRampToValueAtTime(0.0001, a.currentTime + 0.35);
      }
    };

    const toggleMusic = () => {
      ensureAudio();
      const w = document.getElementById("radioWrap");
      if (radio.playing) {
        radio.playing = false; if (w) w.classList.remove("playing"); stopEngine(); playBtn.textContent = "▶";
      } else {
        radio.playing = true; if (w) w.classList.add("playing"); startEngine(); playBtn.textContent = "❚❚";
      }
    };
    const changeTrack = (dir) => {
      radio.idx = (radio.idx + dir + tracks.length) % tracks.length;
      updateDisplay();
      if (radio.playing && radio.actx) { radio.step = 0; radio.nextNoteTime = radio.actx.currentTime + 0.1; }
    };

    playBtn.addEventListener("click", toggleMusic);
    if (prevBtn) prevBtn.addEventListener("click", () => changeTrack(-1));
    if (nextBtn) nextBtn.addEventListener("click", () => changeTrack(1));
  }

  // ── skills word-search game + floating pixel repel ──
  function initSkillsGame() {
    const skills = document.getElementById("skills");
    if (!skills) return;
    const grid = document.getElementById("wsGrid");
    const rowEls = grid ? [...grid.children] : [];
    const cellAt = (r, c) => rowEls[r] && rowEls[r].children[c];
    rowEls.forEach((row, r) => [...row.children].forEach((cell, c) => { cell._r = r; cell._c = c; }));

    const WORDS = [
      { id: "ux", color: "#63E3C2", r: 1, c0: 2, c1: 11 },
      { id: "proto", color: "#C4E75A", r: 3, c0: 3, c1: 13 },
      { id: "design", color: "#F9C846", r: 5, c0: 1, c1: 13 },
      { id: "access", color: "#A66BFF", r: 7, c0: 1, c1: 13 },
      { id: "growth", color: "#FF7EB6", r: 9, c0: 1, c1: 13 },
    ];
    const found = new Set();
    let selecting = false, startCell = null, curSel = [];
    let hintT, idleT;

    const clearSel = () => { curSel.forEach((c) => c.classList.remove("sel")); curSel = []; };
    const paintSel = (r, c0, c1) => {
      clearSel();
      for (let c = c0; c <= c1; c++) { const cell = cellAt(r, c); if (cell) { cell.classList.add("sel"); curSel.push(cell); } }
    };
    const drawPill = (w) => {
      const a = cellAt(w.r, w.c0), b = cellAt(w.r, w.c1);
      if (!a || !b) return;
      const pad = 3;
      const pill = document.createElement("div");
      pill.className = "word-pill";
      pill.style.left = a.offsetLeft - pad + "px";
      pill.style.top = a.offsetTop - pad + "px";
      pill.style.width = b.offsetLeft + b.offsetWidth - a.offsetLeft + pad * 2 + "px";
      pill.style.height = a.offsetHeight + pad * 2 + "px";
      pill.style.borderColor = w.color;
      pill.style.background = w.color + "2E";
      grid.appendChild(pill);
      for (let c = w.c0; c <= w.c1; c++) { const cell = cellAt(w.r, c); if (cell) cell.classList.add("found"); }
      const chip = skills.querySelector('.word-chip[data-chip="' + w.id + '"]');
      if (chip) chip.classList.add("done");
    };

    const beginSel = (cell) => {
      selecting = true; startCell = cell; paintSel(cell._r, cell._c, cell._c);
    };
    const extendSel = (cell) => {
      if (!selecting || !cell || !startCell || cell._r !== startCell._r) return;
      paintSel(startCell._r, Math.min(startCell._c, cell._c), Math.max(startCell._c, cell._c));
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
      const a = cellAt(w.r, w.c0); if (!a || !grid) return;
      const box = document.createElement("div");
      box.className = "hint-arrow";
      box.style.left = a.offsetLeft + a.offsetWidth / 2 - 5 + "px";
      box.style.top = a.offsetTop + a.offsetHeight - 9 + "px";
      box.innerHTML =
        '<svg width="10" height="8" viewBox="0 0 10 8">' +
        '<path d="M2 1.5 L6.5 4 L2 6.5" fill="none" stroke="' + w.color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></path>' +
        "</svg>";
      grid.appendChild(box);
    };
    const hintWord = (w, full) => {
      clearHints();
      const c1 = full ? w.c1 : w.c0;
      for (let c = w.c0; c <= c1; c++) { const cell = cellAt(w.r, c); if (cell) cell.classList.add("hint"); }
      drawArrow(w);
      clearTimeout(hintT);
      hintT = setTimeout(clearHints, full ? 3600 : 5200);
    };

    const onSkillUp = () => {
      if (!selecting) return; selecting = false;
      if (curSel.length >= 2) {
        const r = curSel[0]._r, cols = curSel.map((c) => c._c);
        const mn = Math.min(...cols), mx = Math.max(...cols);
        const hit = WORDS.filter((w) => !found.has(w.id) && w.r === r)
          .map((w) => ({ w, hit: Math.min(mx, w.c1) - Math.max(mn, w.c0) + 1 }))
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

  // ── nav: active-link tracking on click + scroll ──
  function initNav() {
    const nav = document.getElementById("siteNav");
    if (!nav) return;
    const links = [...nav.querySelectorAll(".navlink")];
    const setActive = (key) => links.forEach((l) => {
      const on = l.dataset.nav === key;
      const bar = l.querySelector(".navbar");
      if (bar) bar.style.background = on ? "#121212" : "transparent";
      l.style.fontWeight = on ? "600" : "500";
      l.style.color = on ? "#1A1209" : "#2A2030";
    });
    setActive("home");
    links.forEach((l) => l.addEventListener("click", () => setActive(l.dataset.nav)));
    const zones = [
      { key: "contact", el: document.getElementById("contact") },
      { key: "gallery", el: document.getElementById("gallery") },
    ].filter((z) => z.el);
    const onNavScroll = () => {
      const mid = window.innerHeight * 0.42;
      const hit = zones.find((z) => z.el.getBoundingClientRect().top <= mid);
      setActive(hit ? hit.key : "home");
    };
    window.addEventListener("scroll", onNavScroll, { passive: true });
    onNavScroll();
  }

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
    initNav();
  });
})();
