# Portfolio — working context

Pick-up notes for Naina Gupta's portfolio site. Written so a fresh session (or
a different machine) can continue without re-deriving everything.

Last updated: 2 October 2026.

---

## 1. What this is

A personal portfolio for **Naina Gupta — Product Designer**.

- **Local path:** `/Users/nainaaa/Documents/Portfolio`
- **Repo:** `github.com/nainaaa-aaa/naina-portfolio`, branch `main`
- **Live:** https://eyedesigns.vercel.app — Vercel auto-deploys from `main`
- **Stack:** plain HTML/CSS/vanilla JS. **No build step, no framework, no
  package.json.** Vercel serves the files as they are.

### Running it locally

```bash
python3 .claude/devserver.py 4173
```

A no-store static server (threaded — single-threaded stalled on large files).
Caching is off deliberately so edits show up without a hard refresh.

---

## 2. Pages

| File | What it is | In the nav? |
|---|---|---|
| `index.html` | Home — 1440×900 absolute-positioned hero stage, project cards, word search, journal, contact | Home |
| `gallery.html` | Infinite draggable canvas of personal photos, plus two games | Gallery |
| `resume.html` | Resume as a full site page; prints to a 2-page A4 | Resume |
| `case-study.html` | **Compport** — org structure planning inside an enterprise HRMS | via cards |
| `case-study-altkred.html` | **Altkred** — invoice factoring marketplace for Indian SMEs | via cards |
| `case-study-edme.html` | **Edme** — motor insurance platform. **Local only, see §7** | not linked |

### Shared components

| File | Purpose |
|---|---|
| `nav.js` / `nav.css` | `<site-nav current="…" variant="…">` custom element. One nav for every page |
| `scroll.js` | Damped wheel scrolling, anchor-jump tweening, `[data-slow]` resistance zones |
| `lightbox.js` / `lightbox.css` | Click any `<figure>` image for a full-size overlay |
| `casestudy.js` | Scroll-driven figure tilt + the reading progress rail |
| `main.js` | Homepage only — mobile hero, word search, journal, radio, coupon |
| `gallery.js` | The generated infinite canvas and its two games |
| `styles.css` | Homepage styles |
| `responsive.css` | Shared small-screen layer for home + gallery |

---

## 3. The design system

Defined in each case study's `<style>` block (and `resume.html`). Keep these
in step — they have drifted before and it is always visible.

```
--ink #17161B   --muted #5C5A63   --faint #8A8792
--paper #FBFAF8 --tint #F1EEE8    --hair rgba(23,22,27,.12)
--rule rgba(23,22,27,.13)   ← section dividers only
--blue #3355FF  --green #2BD97C   --coral #FF6B5B  --yellow #F9C846
--purple #A66BFF --mint #63E3C2   --lime #C4E75A   --pink #FF7EB6
```

- **Type:** Space Grotesk (headings), DM Sans (body), IBM Plex Mono (labels),
  Caveat (handwriting). All from Google Fonts.
- **Column:** every content page uses **one 1080px container, 40px padding**
  (`.wrap` and `.wide` are the same box). Prose capped at 680px inside it.
  This was three different widths at one point; do not reintroduce that.
- **Heading scale:** page title > stage > part, and it must hold at *every*
  width. Measured: 60/54/25 at 1440, 34/27/20 at 375. Watch `clamp()` floors —
  a stage floor above the h1 floor inverts the hierarchy on phones.
- **Section rules:** 1px `var(--rule)` grey. Not accent-coloured — they
  shouted louder than the headings they introduced.

### Colour means something

- **blue** — concept, decisions, important notes
- **yellow** — people and examples
- **green** — what gets better
- **coral** — the problem and failures

Numbered stage chips use `--accent-ink`: white on blue, ink on everything
lighter. `:root` defaults it to `var(--ink)`; blue sections set white inline.

---

## 4. Case-study structure

All three follow the same model. Match it for anything new.

```
hero  — kicker, h1, standfirst, glimpse screen, meta <dl>, colour legend
brief — "What is X?" plain-language intro
TL;DR — dark card, 4 bullets, "Skip to the design ↓" → #design
stages — .stage with .stage-head (number chip, h2, lede)
         └ .part with .slabel, h3, prose
journeys inside the Design stage, each with a .call decision block
outcome — .metric card with .delta caveat
learnings — .learn / .lrn cards
footer — .end, cross-links to the next case study
```

- **Stages:** Discovery, Defining, Exploration, Design, Outcome, Learnings.
  Edme has five (no Exploration) because its content did not support one —
  don't invent a stage to force symmetry.
- **172px** of clear space above each stage.
- **Decision blocks** (`.call`): considered (struck through) → chosen (green
  arrow) → reason. Edme adds `.call .why` for the reason line.
- **Figures:** `Fig NN` in a `.fno` span, caption as 15.5px prose (14.5px on
  mobile). Numbered in document order.
- **One screen per line.** `.grid2.two` pairs two only where they genuinely
  read as a pair (a blocked state beside the screen that clears it).
- **Screens render at their natural height.** There was a `max-height: 440px;
  object-fit: cover` cap that hid 23–71% of the taller screenshots. Removed.
  `img.ph` must keep `aspect-ratio: auto` or the `.ph` placeholder rule's
  `16/10` letterboxes it.

---

## 5. Content rules — these matter

Driven by a content audit Naina wrote (`Naina-Portfolio-Content-Audit-v3.docx`
in ~/Downloads). The goal is copy that reads as hers and not machine-made.

1. **Never invent metrics.** She asked directly whether numbers could be
   constructed; the answer was no, and fabricated figures were removed.
   Anything unmeasured is labelled a **design target**, not a result.
   - Compport and Altkred both carry a `.delta` caveat inside the metric card.
   - Edme is pre-launch — the Outcome stage says so explicitly.
2. **Em dashes are kept low** in prose. Altkred sits at 4. Use commas, colons
   or parentheses.
3. **No emoji** anywhere in site copy.
4. **Titles say "Product Designer"**, not "UI/UX Designer" — one positioning
   across the whole site. (Her resume's Title field still lists both, since
   that is her actual job title. Her call, flagged and left.)
5. **Alt text describes the image**, written after looking at it.
6. **Don't claim work that isn't hers.** Compport says she left before launch.

### Still open (her decisions, not mine)

- The coupon gag on the homepage — kept, strategic call left to her.
- Unverifiable stats (OrgChart, ContinuumCloud, Deloitte) — left in place with
  a recommendation to link or cut. Panko 2008 is properly cited.
- Her Behance URL — the resume's link was removed rather than guessed.
- One `.note` caveat remains on Compport ("Both scenarios are illustrative…").

---

## 6. Things that will waste your time if you don't know them

### The Browser pane

- **rAF is frozen while the pane is hidden.** Anything driven by
  `requestAnimationFrame` — smooth scrolling, the scroll tween, CSS smooth
  scroll — will not advance. Scroll logic is verified with a Node harness
  instead (see below).
- **Mid-page screenshots come back blank.** It composites at scroll 0. Work
  around it with `document.body.style.marginTop = '-NNNpx'` to pull content
  up, then reset.
- **Viewport emulation does not fire a `resize` event.** `innerWidth` changes
  but the page is never told, so resize-driven code looks broken. Dispatch
  `new Event('resize')` manually.
- **The console buffer persists across navigations.** Stale errors from
  earlier injected test scripts look live. Open a fresh tab to confirm.
- `computer{action:"zoom"}` region crop is not supported — returns the full
  screenshot.

### Vercel

- **`curl` cannot check whether a deploy landed.** Vercel returns
  `x-vercel-mitigated: challenge` to curl regardless of user agent, so a
  "200 OK" may be a challenge page. Verify through the Browser pane.
- A deploy has silently failed to trigger once. An **empty commit** re-fires
  the hook. There is no build step, so build failure is not the likely cause.

### Verifying scroll behaviour

`scroll.js` is exercised by a Node harness with a stubbed DOM. Keep it in
sync if the module's call shape changes. It covers: resistance over the work
cards, anchor jumps landing on target, a nudge mid-jump redirecting rather
than stranding, and upward scrolling never being held.

---

## 7. Edme — current state

Built 2 Oct 2026 from a Claude Docs artifact, **"Edme — Formal Variant"** tab:

- Doc id `2708af00-f4fc-4290-9d17-60b7067ed950`, tab `463bc988-81cb`
- Read it with the Claude Docs connector (`read`, ref
  `{"object":"project","id":"<doc id>"}`), not by fetching the URL.
- The other tab (`3dd67c76-0eb7`) is a less formal variant — **not** the one in
  use.

**Screens** come from `~/Downloads/CLaude portfolio rough.pdf` (153 pages,
348MB). Thirteen pages were chosen by indexing every page's text and matching
it to the flows. Rendered by splitting single pages out with `pypdf` and
rasterising with `qlmanage -t -s 1440`. Assets in `assets/edme/` (~5.3MB).

**Deliberately local only.** Not linked from `index.html`, not pushed. It is
committed to `main` locally; `origin/main` does not have it.

### Two unresolved contradictions between the text and the screens

Flagged to Naina, not yet answered:

1. The text says the IDV control is **"a draggable slider with Minimum,
   Recommended and Maximum markers."** The actual screen is a **radio group**
   (Minimum / Maximum / Custom IDV) with a numeric input and a Min–Max range
   bar. The caption was softened to "a bounded control"; the body copy still
   says slider.
2. The text says **"eight steps"** from vehicle details to an issued policy.
   The stepper in the screens shows **five** (Issuance Details, Quote Creation,
   KYC Verification, Proposal Details, Checkout), and six later where Review
   and Payment Mode split out.

Also: the doc's Context section has three embedded persona images that were
**not** used — she said to take images from the PDF, so the five roles are
text cards. They can be pulled from the doc's blobs if she wants them.

---

## 8. Homepage specifics

- The hero is a **1440×900 absolutely-positioned stage**, scaled to fit.
  Below 760px `initMobileHero()` in `main.js` **relocates the real prop nodes**
  (not clones, so handlers survive) into a stacked column. It is **reversible**
  — `relocate()` / `teardown()`. It was one-way once and crossing the
  breakpoint twice left the desktop stage empty.
- **View Work** is a plain link (no button chrome) on the eyebrow's line,
  mirroring its 206px inset from the right, pointing at `#projects`.
  `initMobileHero` finds it **by id**, not by href — the href has moved once.
- **Project cards** part from the centre as the section arrives (`[data-spread]`)
  and the page resists scrolling while they are centred (`[data-slow]`): the
  same gesture travels 1800px normally, 504px over the cards.
- The pre-hidden state lives in the cascade behind a `js` class on `<html>`, set in
  `<head>` — not added by JS on DOMContentLoaded, or the cards flash.
- **The radio** plays Khalid — "Young Dumb & Broke" (`IPfJnp1guPc`) through a
  YouTube embed, built on first click so no third-party request happens
  otherwise. Starts at 0:20. **It is not connected to her YouTube Music
  account** — there is no public API for a personal library, and that needs
  OAuth she would set up herself.
- **Word search:** 12×15 grid, 5 across + 3 down. Photo choice is
  `(i + 3j) mod N`, which provably never repeats within two cells for N ≥ 9.
  Chips sit **above** the grid. Keep `WORDS` in `main.js` in step with the
  letters in the markup.

---

## 9. Gallery specifics

- **Generated, not tiled.** Each cell is built from a hash of its coordinates,
  so a place looks the same every return without repeating on a fixed period.
  Cells recycle as they leave the viewport.
- A cell is a **spatial index, not a slot** — a card may sit anywhere inside
  it, and a cell checks its neighbours (in any order, no shared state) to
  decide which gives way. That is what stops it reading as rows and columns.
- Cells are sized off the **largest a card can ever be** (`SCALE_MAX`), or the
  biggest cards have no jitter room and line up in rows.
- **Card sizes vary 0.62×–1.32×.** Identically sized cards read as a grid
  wherever you put them.
- Density is deliberately low (~19% coverage), modelled on
  `plustolevel.taptop.site/content` — 12 items at 18.1% over 2528×1760.
  Note that reference **does** repeat (3×3 lattice); ours does not.
- **The heading and both games are pinned** — one of each, riding above the
  field, never cloned. Naina asked for this explicitly.
- Games: tic-tac-toe (AI blocks and wins, not random) and rock-paper-scissors
  (inline SVG hands, not emoji).

---

## 10. How she works

- Wants **consistency across pages** above almost everything. Most sessions
  have ended with "make it consistent throughout."
- Prefers **subtle** over loud — grey rules over coloured bars, a link over a
  button, "a lot of empty space."
- Gives **short, direct corrections** and expects them applied, not debated.
- Will say **"push to vercel"** when she wants it live. Otherwise don't.
- Worth telling her plainly when an instruction conflicts with an earlier one
  (e.g. "reduce the height of the screens" vs "don't cut the screens off") and
  which way it was resolved.
- Measure before claiming something is fixed. Several bugs here were only
  found because a number was checked rather than eyeballed.
