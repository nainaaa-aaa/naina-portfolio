# Portfolio — working context

Pick-up notes for Naina Gupta's portfolio site. Written so a fresh session (or
a different machine) can continue without re-deriving everything.

Last updated: 12 November 2026.

> **This file is in a public repository.** It holds no credentials and no real
> client names. Setup steps, account details, links and the source design files
> travel separately in the private handoff bundle (`HANDOFF.md` inside it),
> never in this repo.

---

## 1. What this is

A personal portfolio for **Naina Gupta — Product Designer**.

- **Repo:** `github.com/nainaaa-aaa/naina-portfolio`, branch `main` — **public**
- **Live:** https://eyedesigns.vercel.app — Vercel auto-deploys every push to `main`
- **Stack:** plain HTML/CSS/vanilla JS. **No build step, no framework, no
  package.json.** Vercel serves the files exactly as they are in the repo.

### Running it locally

```bash
python3 .claude/devserver.py 4173
```

Then open http://localhost:4173. It is `http.server` with caching switched off,
so edits show without a hard refresh. **`.claude/` is gitignored**, so a fresh
clone does not have this file — it is in the handoff bundle. Plain
`python3 -m http.server 4173` also works if you hard-refresh after edits.

### Not in git, deliberately

| Path | What | Where it lives instead |
|---|---|---|
| `.claude/` | dev server + Claude Code local settings | handoff bundle |
| `assets/Gallery Images/` | full-size gallery originals | handoff bundle |
| source design files | Figma exports, PDFs, specs the case studies came from | handoff bundle |

---

## 2. Two projects are anonymised — read before touching them

**Faktra** (invoice factoring) and **Motric** (motor insurance) are pseudonyms.
Neither product has launched, so their real names cannot appear on the site.

- Changed everywhere: page titles, cards, resume, alt text, **file names, URLs
  and asset paths** (`case-study-faktra.html`, `assets/motric/`).
- Every screenshot has had the **product wordmark, third-party bank/company
  logos and named people** painted out. Do this for every new screenshot too —
  the tools for it are in the handoff bundle (`tools/`), see §9.
- The resume says plainly, under Selected Projects, that two projects appear
  under anonymised names with branding removed.
- **Never reintroduce a real name, and never write the mapping in this repo.**
- **The git history still holds the originals.** Commits before `8a71d90`
  contain the real names and the unedited screenshots. Anonymising the working
  tree did not remove them; only a history rewrite + force push would. Not done
  — it needs Naina's explicit go-ahead.

### Do not make the repo private

It was tried. **Vercel silently stops building when the repo is private**: the
site keeps serving the last build and pushes simply never deploy. Nothing in
the Vercel dashboard announces it. To go private, first reauthorise Vercel's
GitHub integration for private repositories.

---

## 3. Pages and components

| File | What it is |
|---|---|
| `index.html` | Home — hero, three work cards, word search, journal, contact/coupon |
| `gallery.html` | Infinite draggable canvas of personal photos, plus two games |
| `resume.html` | Resume as a full site page; prints to A4 |
| `case-study.html` | **Compport** — org structure planning in an enterprise HRMS |
| `case-study-faktra.html` | **Faktra** — invoice factoring marketplace for Indian SMEs |
| `case-study-motric.html` | **Motric** — motor insurance platform for dealership networks |

All three case studies are linked from the home page work cards and live.

| File | Purpose |
|---|---|
| `nav.js` / `nav.css` | `<site-nav current="…" variant="…">` — one nav component, every page. Only whole-page links (Home, Gallery, Resume) |
| `scroll.js` | Damped wheel scrolling, anchor-jump tweening, `[data-slow]` resistance zones |
| `lightbox.js` / `lightbox.css` | Click any `<figure>` image for a full-size overlay. All classes `lb-` prefixed |
| `casestudy.js` | Scroll-driven figure tilt + reading progress rail |
| `main.js` | Home page only — hero, deck, word search, journal, radio, coupon |
| `gallery.js` | The generated canvas, its two games, the drawn cursor |
| `hover.js` | `data-hover="…"` inline hover styles |
| `styles.css` | Home page styles |
| `responsive.css` | Small-screen layer for home + gallery. Breakpoint **760px** |

---

## 4. The design system

Defined in each case study's `<style>` block and `resume.html`. Keep them in
step — they have drifted before and it is always visible.

```
--ink #17161B   --muted #5C5A63   --faint #8A8792
--paper #FBFAF8 --tint #F1EEE8    --hair rgba(23,22,27,.12)
--rule rgba(23,22,27,.13)   ← section dividers only
--blue #3355FF  --green #2BD97C   --coral #FF6B5B  --yellow #F9C846
--purple #A66BFF --mint #63E3C2   --lime #C4E75A   --pink #FF7EB6
```

- **Type:** Space Grotesk (headings), DM Sans (body), IBM Plex Mono (labels),
  Caveat (handwriting). Google Fonts.
- **Column:** one 1080px container, 40px padding (`.wrap` and `.wide` are the
  same box). Prose capped at 680px.
- **Heading scale** page title > stage > part, at every width. Watch `clamp()`
  floors — a stage floor above the h1 floor inverts it on phones.
- **Section rules** are 1px `var(--rule)` grey, never accent-coloured.

**Colour means something:** blue = concepts and decisions · yellow = people and
examples · green = what gets better · coral = problems and failures.

---

## 5. Case-study structure

All three follow one model. Match it for anything new.

```
hero  — kicker, h1, standfirst, glimpse image, meta <dl>, colour legend
brief — "What is X?"
TL;DR — dark card, 4 bullets, "Skip to the design ↓" → #design
stages — .stage > .stage-head (number chip, h2, lede) > .part
journeys inside Design, each with a .call decision block
outcome — .metric card with .delta caveat
learnings — .learn cards
footer — .end, cross-link to the next case study
```

- **Glimpse image:** Faktra and Motric open on a photograph of the product on a
  laptop, at its own proportions, with **no browser chrome and no crop**.
- **Figures:** `Fig NN` in a `.fno` span, numbered in document order —
  renumber with a script, never by hand. Motric has 15.
- **Screens render at natural height.** `img.ph` must keep `aspect-ratio: auto`
  or the placeholder's `16/10` letterboxes it. A height cap here once hid up to
  71% of the taller screens.
- **One screen per line**; `.grid2.two` only for a genuine pair.
- **Motric flow boards** (`.flow`): three user-flow diagrams, inline SVG, one
  before the screens of each of the first three journeys. Labelled *Flow*, not
  *Fig*, on paper rather than tint. Below 860px they scroll sideways at 700px
  wide rather than shrink to unreadable. Claims has no flow — the source had
  none, and none was invented.
- **Motric personas:** one image, four cards for five roles (the territory,
  zonal and national managers share one card — the caption explains why).

---

## 6. Content rules — these matter

1. **Never invent metrics.** Naina asked directly whether numbers could be
   constructed; the answer was no. Unmeasured figures are labelled *design
   targets*. Motric is pre-launch and says so.
2. **Em dashes kept low** in prose.
3. **No emoji** in site copy.
4. **"Product Designer"** is the positioning everywhere.
5. **Alt text describes the image**, written after looking at it.
6. **Don't claim work that isn't hers.**
7. Resume content follows her PDF verbatim — the Compport numbers (15–20 min →
   8–10, 70–75% → 90–95%, 20% → 8–10%) are hers, quoted as written.

**Open, her call:** whether Motric should appear in her resume PDF (it's on the
site but not in the PDF's Selected Projects); Neuroverse now lives only as the
parenthetical on its award.

---

## 7. Home page specifics

### Desktop
- Hero is a **1440×900 absolutely-positioned stage**, scaled to fit.
- **Work cards** part from the centre on arrival (`[data-spread]`) and the page
  resists scrolling while they are centred (`[data-slow]`).
- **Radio** plays one YouTube track, embedded on first click only. It is not
  connected to her YouTube Music account (no public API for that).

### Below 760px — rebuilt for phones
- **Hero scatter:** `initMobileHero()` relocates the real prop nodes (not
  clones, so handlers survive) around a centred headline. Each prop is ~3% of a
  375×812 screen. Positions are CSS, keyed by `data-prop`. Reversible on resize.
- **Work cards are a swipe deck** (`initCardDeck()`): stacked at wrong angles; a
  horizontal swipe throws the top card to the **bottom** and brings the next up
  — it loops. Hit-testing uses the card's box. A drag never counts as a tap.
  The `busy` flag clears on a **timer, not rAF** — rAF doesn't run in a
  background tab and the deck would lock.
- **Journal** is open by default and can't be tapped shut.

### Word search (both sizes)
- **Two grids, one game.** Desktop: 15 columns × 12 rows from the markup.
  Phone: 12 columns × 15 rows, defined as `TALL` in `main.js`. Both 5 across +
  3 down. `mount()` swaps them at the breakpoint and restarts the round.
- New grids must be **solved** so every crossing agrees — there is a solver in
  the handoff bundle's tools. Then trace all eight words in the browser.
- **Hints (word chips) and grid sit together; the Found / timer bar is below
  the grid.** Clock starts on first drag, not on arrival. Hints are counted
  only when a chip is *clicked*, not hovered.
- 8/8 opens a "Congratulations — you know me" scoreboard with confetti.

### Coupon
- Desktop: the button dodges the cursor.
- Click (any size): shrinks and says "Try once more", shrinking each click; the
  7th opens the popup. "okay you win" appears **only when the popup opens**,
  and stays after it is closed (it sits under the popup).

---

## 8. Gallery specifics

- **Generated, not tiled.** Each cell built from a hash of its coordinates.
  Photo choice `(i + 3j) mod N` — never repeats within two cells for N ≥ 9.
  16 photos.
- Cells are a spatial index, not slots; neighbours decide who gives way.
  Measured: zero overlaps, 5–8 cards per screen.
- **Dot-grid background** stays. Cursor is a **drawn open/closed hand**.
- **Both games are easter eggs**: parked just past the first screen's edges
  (`innerWidth/2 + 550`, ~4 wheel notches), level with the heading — tic-tac-toe
  left, rock-paper-scissors right. Reserve boxes are measured off the real
  elements so photos never overlap them.
- **Rock-paper-scissors:** drawn hands, yellow cuffs = you, purple = computer.
  Both fists bob three times before the reveal; the winner's side gets the
  burst, flag and confetti.

---

## 9. Tools (in the handoff bundle, not the repo)

No ImageMagick, ffmpeg or PIL on the original machine, so these use `sips`
(macOS, built in) + `numpy`:

- `img.py` — load/save any image via BMP round-trip through `sips`
- `delogo.py` — find a light wordmark on a dark header and erase it by
  interpolating each row between the pixels either side (invisible on a
  gradient); flat-fill helper for white areas
- `wordsearch_solve.py` — places the 8 skills in a grid of any size, all
  crossings consistent

**Always preview detection boxes before painting.** On the original screens a
detector over-matched and flagged ordinary table content as logos; checking
the preview is what stopped real content being erased.

---

## 10. Things that will waste your time

### Claude Code's Browser pane
- **rAF is frozen while the pane is hidden**, and **CSS transitions don't
  advance inside one long-running script**. Do the click in one call and the
  read in the next.
- **Viewport emulation doesn't fire `resize`.** Test a breakpoint by loading
  fresh at that width, or dispatch `new Event('resize')`.
- **The console buffer persists across navigations** — but don't assume an
  error is stale. One "stale" error here was a real bug; check the served file.
- **Mid-page screenshots can come back blank** — it composites at scroll 0.

### Vercel
- **Verify a deploy against a file the site serves.** A commit touching only
  this file looks identical whether or not anything built — that is how two
  failed deploys went unnoticed. Compare the live `main.js` to the local one.
- `curl` can't check deploys (Vercel returns a challenge page). Use a browser.
- If a deploy doesn't fire, an empty commit re-triggers it.

### CSS traps found here
- `overflow: hidden` on an ancestor kills `position: sticky` silently — use
  `overflow: clip`.
- A class selector beats the UA's `[hidden]` — overlays need
  `.x[hidden] { display: none !important }`.
- `[data-native-scroll]` regions must only claim the wheel when they can
  actually scroll (`ownsWheel()` in `scroll.js`) — otherwise the page lurches.

### Not available any more
The Node harness that once tested `scroll.js` lived in a temporary folder and
is gone. Verify scroll behaviour in a real browser.

---

## 11. How she works

- Wants **consistency across pages** above almost everything.
- Prefers **subtle** — grey rules over coloured bars, a link over a button,
  plenty of empty space.
- Short, direct corrections; expects them applied, not debated.
- Says **"push to vercel"** / "push" when she wants it live. Otherwise commit
  locally and stop.
- Tell her plainly when an instruction conflicts with an earlier one, and which
  way it was resolved.
- **Measure before claiming something is fixed.** Most bugs here were found
  because a number was checked rather than eyeballed.
