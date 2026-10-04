# Handoff: Climbing-first life tracker (v0)

## Overview
A single-user iPhone PWA (or Capacitor build) that logs climbing, strength, running, food, sleep and mindfulness around climbing-native primitives — grade, attempts, hang time, finger load. Its job: make the right next session obvious on a Monday morning. Five tabs: **Today, Log, Load, Tests, Me**. The Load tab is the heart; everything else feeds it.

Source brief: "Climbing-first life tracker — design handoff" (Sep 7, 2026, @Oli). This README covers what the design adds on top of that brief; the brief's data model and principles still apply.

## About the design files
`Climbing Tracker.dc.html` is a **design reference built in HTML**, not production code. Open it in a browser (keep `support.js` alongside). Recreate it in the target stack — suggested: Vite + React (or SvelteKit) PWA, IndexedDB via Dexie, offline-first, no backend. Don't ship the HTML.

The file is a pan/zoom canvas. Artboard IDs:
- **1a** Today · **1b** Log (archetype chooser) · **1c** Load · **1d** Tests · **1e** Me
- **3a** Limit boulder form with docked grade picker (interactive) + gym sheet
- **2a** Grade picker anatomy + per-gym conversion table · **2b** Cross-gym grade matrix
- **4a** Readiness sentence states + finger-load formula
- **5a** Component sheet

## Fidelity
**High-fidelity.** Colours, type, spacing, radii and copy are final for v0. Data shown is sample data.

## Global constraints (from brief — enforce)
- iPhone only, portrait, 390pt design width. Dark theme only.
- Every hit target ≥ 44×44pt. Primary actions live in the bottom half (thumb zone).
- Offline-first: every write goes to IndexedDB immediately; nothing blocks on network.
- Boulder log entry ≤ 10 s. Never block a save on a missing field — default everything, edit later.
- Flat tab bar; any sheet dismisses with a downward swipe.
- No celebratory animation. Confirmation = one line of text.

## Design tokens

### Colour
| Token | Hex | Use |
|---|---|---|
| bg | `#0A0909` | App background (near-black) |
| canvas | `#161415` | Presentation canvas only (not in app) |
| surface-1 | `#141213` | Cards, bottom sheets |
| surface-2 | `#1C191A` | Chips, inset notes, secondary buttons, unselected cells |
| line | `#2A2627` | Card borders (1px), empty meter segments |
| line-soft | `#1C191A` | Row dividers, tab-bar top border |
| line-strong | `#3A3536` | Open habit dot ring (2px inset), dashed/outline chips |
| edge-black | `#4A4446` | 1.5px inset ring on black swatches so they read on dark |
| ink | `#F3ECE8` | Primary text; "selected" fill |
| ink-2 | `#A39A97` | Secondary text |
| ink-3 | `#6E6764` | Labels, captions, inactive tabs |
| mint | `#10FFCB` | Circuits / low finger load · Flash · success text |
| aqua | `#B5F8FE` | Intervals / moderate · sleep bars (≥7.5h); `#4E7376` below |
| strawberry | `#F75590` | Limit boulder / high · finger-load trace |
| purple | `#C9A2FF` | Hangboard / very high (derived to complete gym order) |
| jasmine | `#FBD87F` | Caution only: watching niggles, stale tests, "ease" readiness |
| petal | `#FCE4D8` | No finger load (strength, run) · food intake bands |
| orange | `#FFB27A` | Gym colour band only (Vertical Art "Orange") |

**Intensity rule:** accent = finger-load class, following gym colour order. Circuits mint → Intervals aqua → Limit strawberry → Hangboard purple; Strength/Run petal. Text on any accent fill is `#0A0909`.
**Never red numbers for food.** Low-fuel days get a neutral sentence, not a colour.

### Typography
- **Archivo** (variable, wdth 62–125, wght 400–800) — all UI.
- **JetBrains Mono** 400/500/600 — labels, captions, units, tabular reference data.

| Role | Spec |
|---|---|
| Screen title | Archivo 700, 28px, ls −0.02em |
| Hero numeral (grade in picker) | Archivo 800, 46px, font-stretch 115%, ls −0.03em, lh 1 |
| Big numeral (sleep, timer) | Archivo 700, 34–38px, font-stretch 112%, tabular-nums, ls −0.03em |
| Card title | Archivo 750, 30px, stretch 112% (planned session); 20px 700 (archetype tile) |
| Readiness sentence | Archivo 600, 22px, lh 1.28, ls −0.01em, `text-wrap: pretty` |
| Body | Archivo 400–600, 13–15px |
| Label | JetBrains Mono 600, 11px, ls 0.08em, UPPERCASE, ink-3 (or accent) |
| Caption / unit | JetBrains Mono 500, 10–12px |
| Tab label | Archivo 600, 12px |

### Radii
Phone 48 (mock only) · card 20 · tile 18–20 · bottom sheet 24 (top corners) · primary button 14–16 · chip/swatch 12 · fine cell / number cell 10–12 · problem swatch 8 · pill 14 (full) · bars 3–4.

### Spacing
Screen side padding 16. Card padding 14–16. Gaps: 12 between cards, 10 grid gutter, 5–6 inside picker rows, 8 inside chip rows. No shadows anywhere; separation is surface colour + 1px `line` border.

### Selected-state ring
`box-shadow: 0 0 0 2px #141213, 0 0 0 4px #F3ECE8` (2px gap, 2px ink ring). Black swatch additionally keeps `inset 0 0 0 1.5px #4A4446`.

## Screens

### Shell
- Status bar 47pt. Tab bar 84pt: 5 equal columns, 3×20 indicator bar above label (ink when active, transparent otherwise), label ink / ink-3. Top border 1px `#1C191A`.

### 1a Today — "What am I doing today, and did I do it?"
Top→bottom, gap 12:
1. Header row: "Monday" (title) + right "5 OCT · WK 41" (mono 12, ink-2).
2. **Planned session card** (surface-1, border, r20, p16, gap 12): label "PLANNED · FINGER LOAD HIGH" in archetype accent + "75 MIN" ink-3; title "Limit boulder"; sub "Arkose · rouges and noirs · crimps first"; inset weakness note (surface-2, r12, p 10/12, 13px ink-2) pulled from latest relevant BodyNote; **Start session** button 56pt, accent fill, r14, 700/17.
3. **Habit dots**: Stretch, Read, Guitar, Mind. 52pt circles + 12px label. Open = 2px inset `#3A3536`; done = ink fill + ✓ (#0A0909, 800/20). Tap = done; long-press = undo (yellow ring state in 5a). No partial states. Mindfulness dot can show duration ("12m").
4. Two tiles (1fr 1fr): **Sleep** — "7h42" numeral with small "h", caption "Up 06:52 · +7m on alarm". **Fuel so far** — "1.4–1.7k" range, 8px track with demand band outlined (`#6E6764` 1px) and intake bar in petal, caption "vs 2.6–3.0k climbing day".
5. **How I feel** row: label + summary "Energy ok · Sore low · Keen high" + 44pt button "Same as Sun" (ink fill) → becomes "✓ Logged" (mint text, transparent). Defaults to yesterday's answers; tapping the row (not built) expands three 3-point scales.
6. **Supplement ticks**: equal-width 44pt chips for supplements due today. Taken = surface-2 + mint ✓; due = 1px inset `#3A3536`, ink-2 text.

### 1b Log — "Record what just happened"
- Header "Log" + gym chip (36pt, surface-2, mint dot, "{gym} · Font").
- 2×3 grid of 152pt archetype tiles (surface-1, r20, p14): accent dot 12px, name 20/700, field hint 12 ink-2, 4-segment finger-load meter (4px bars, accent vs `#2A2627`) + "FINGER · {NONE|LOW|MODERATE|HIGH|VERY HIGH}".
  - Limit boulder (strawberry, 3) · Intervals (aqua, 2) · Circuits (mint, 1) · Hangboard (purple, 4) · Strength (petal, 0) · Run (petal, 0).
- Footer row "LAST LOGGED · Sat · Intervals · 5 × 8 moves" + "Edit".
- Tapping a tile opens that archetype full-screen; only its fields.

### 3a Limit boulder form + grade picker (the critical component)
Full-screen sheet, no tab bar.
- **Header**: label "LIMIT BOULDER · {n} PROBLEMS" (strawberry) over live timer "38:12" (34px numeral). Right: **gym chip** (44pt, surface-2, mint dot, gym name) → opens gym sheet; "End" (44pt outline).
- **Problem list** (newest first): 56pt rows — swatch 32×28 r8 (band colour; for Block'Out neutral `#2A2627` with "B7" inside), grade 24/700 stretch 112%, mono "{tag as entered} · {other scale} · ×{attempts}", outcome pill (Flash = mint fill, Send = ink fill, Project = 1.5px `#6E6764` outline, ink-2 text).
- **Confirmation**: after logging, one 36pt line "✓ 7A send logged" in mint at top of list; disappears after 1.8 s. Nothing else animates.
- **Docked picker** (surface-1, top r24, p 14/16/26, gap 12):
  1. Readout row: grade 46px (preferred scale) + mono "{other scale} · {band} @ {gym}". Right: attempts stepper (−/+ 44pt surface-2 buttons, value 20/700, "TRIES" 9px mono). Default 1.
  2. **Tag row** — depends on gym `kind`:
     - `colour`: one 56pt-tall swatch per band, flex:1, gap 5, r12, in that gym's difficulty order. Selected = ring.
     - `number` (Block'Out): 6-column grid of 44pt cells B0–B15, r10. Selected = ink fill, dark text.
  3. **Fine row** (colour gyms, only when band spans >1 Font grade; user-toggleable): one 44pt cell per Font grade in the band; defaults to the band's middle (`floor((n−1)/2)`). Selected = ink fill.
  4. **Outcome row**: Flash / Send / Project, 64pt, r16, 750/17. **Tapping an outcome is the save.** Commits row, resets attempts to 1, keeps colour + fine selection for the next problem.
- Flow: read tag → tap swatch (~1 s) → tap outcome (~1 s). Target 3 s, budget 10 s.
- **Gym sheet** (overlay `rgba(0,0,0,.6)`, sheet surface-1 r24): grabber, label "WHERE ARE YOU CLIMBING TODAY?", 64pt rows: gym name 16/700 + mono note + 6px colour strip of its bands; mint ✓ on current; "+ Add a gym — map its colours once". Picking a gym sets band to the middle band and closes. Gym is chosen once per session and persisted on the Session (`gymId`).

### 1c Load — "Am I ready to go hard, or should I back off?" (read-only)
1. **Readiness sentence** (label "READINESS · MON 5 OCT"): verdict clause coloured, reason clause ink. States in 4a:
   - GO (mint): "Good day to pull hard." + reason
   - EASE (jasmine): "Keep fingers sub-maximal today." + reason
   - REST FINGERS (strawberry): "Rest your fingers today." + reason + alternative
2. **Finger load · 4 wk** card: 324×112 chart. Norm band = `#2A2627` @ 60% rect; trace = strawberry 2.5px polyline, round joins; area fill strawberry @ 12%; today's point = 5r dot + 10r jasmine ring when a niggle is watched. X labels mono 11 (dates, "TODAY" in ink). Footer: jasmine dot + "L ring A2 · watching since 22 Sep".
3. **Session load · 14 d**: 56pt-tall bars, gap 5, r3, coloured by archetype; rest days = 4% `#2A2627` stub. Caption "RPE × MIN".
4. **Grade pyramid · 8 wk**: 18pt rows, grade label mono, filled bar = sends, outlined bar = projects, colour = current gym's band for that grade (black/number → `#6E6764`), right count "5 · 1".

### 1d Tests — "Am I actually getting stronger?"
- Stale prompt card (1px jasmine border): "9 WEEKS STALE" / "Max hang, 20 mm" / "Last +18 kg · 3 Aug" + **Run test** (48pt jasmine fill). Shown for any test > 8 weeks old.
- Rows: name 15/600 + conditions 12 ink-3; 6-bar history (latest bar ink, others `#3A3536`); value 24/700 + unit + mono delta/date.

### 1e Me — sleep, food, mind, profile
- **Sleep · 7 nights**: bars (aqua ≥7.5h else `#4E7376`) with dashed target line at 8h; caption wake drift vs alarm.
- **Fuel vs training**: per day — mono day, strawberry dot if climbing day, track with demand band (1px `#6E6764` outline) and intake band (petal, 6px). Scale 1500–3500 kcal. One neutral sentence for climbing days that came in low. No targets, no deficits, no red.
- **Mindfulness** row "9 of 14 days · 11 min avg" + "Start timer" (44pt).
- Profile rows (44pt, dividers): Equipment, Exercise preferences, Weakness notes, Niggles (jasmine count when watching). Body weight row is off by default.

### 5a Components
Habit dot (open / done / undoing / timed) · Plate chip (preset, logged, text-estimate, photo-estimate — always a kcal **range** + source label) · Session card (4 intensity variants) · Number display (grade, hang, sleep, kcal range).

## Grading system (reference data)
Canonical scale = **Font** (`3, 4, 4+, 5A, 5B, 5C, 6A, 6A+, 6B, 6B+, 6C, 6C+, 7A, 7A+, 7B, 7B+, 7C, 7C+, 8A…`). V shown alongside. Store `gradeCanonical` + `gradeAsEntered` (+ `gymId`). Display preference: Font or V (global setting).

Gym profile shape:
```ts
type Gym = { id; name; kind: 'colour' | 'number'; bands: { name: string; color: string; grades: FontGrade[] }[] }
```
Shipped profiles:
| Gym | Bands → Font |
|---|---|
| Arkose (also M Roc) | Blanc 3 · Jaune 4–4+ · Vert 5A–5C · Bleu 6A–6A+ · Rouge 6B–6C · Noir 6C+–7A+ · Violet 7B–7C+ |
| Block'Out (`number`) | B0 4 · B1 4+ · B2 5A · B3 5B–5C · B4 6A · B5 6A+ · B6 6B · B7 6B+ · B8 6C · B9 6C+ · B10 7A · B11 7A+ · B12 7B · B13 7B+ · B14 7C · B15 7C+ |
| Vertical Art (also Hardbloc) | Orange 4–4+ · Vert 5A–5C · Bleu 6A–6B · Rouge 6B+–6C+ · Noir 7A–7B · Violet 7B+–7C+ |
| The Roof | **Placeholder — must be confirmed.** Grade is given by the start sticker (pastille) colour, not hold colour. Current mock: Jaune 4–5A · Vert 5B–6A · Bleu 6A+–6B+ · Rouge 6C–7A · Noir 7A+–7B+ · Violet 7C–8A |

Arkose in-between grades (5C, 6A+, 6C, 7A+) are assigned to the nearer band. Users can add/edit a gym profile in Me › Gyms (not designed yet — simple list of band name + colour + Font range).

## Interactions & behaviour
- Habit dot: tap → done; long-press (500 ms) → undo.
- Supplement chip / check-in: tap toggles.
- Picker: swatch tap sets band + resets fine to middle; fine tap sets grade; outcome tap writes Problem and shows 1.8 s confirmation. Attempts clamp 1–99.
- Gym sheet: tap chip to open, tap scrim or swipe down to close.
- Only motion: 150 ms opacity fade for confirmation line and sheet scrim; sheets slide 250 ms ease-out. No springs, confetti or badges.

## State (per-screen, beyond persisted entities)
- Log form: `gymId, bandIndex, fineIndex, attempts, toast`. Session `gymId` persists so reopening keeps the gym.
- Global: `gradeDisplay: 'Font' | 'V'`, `showFineRow: boolean`.
- Derived at read time (never stored): finger load per session (weights: hangboard 1.0, limit 0.8, intervals 0.5, circuits 0.25, strength/run 0 × volume × intensity), rolling 7-day sum trace over 28 days, norm band (your own 4-week IQR), general load (RPE × min), grade pyramid, readiness sentence, sleep debt, wake drift, intake band vs demand.

### Readiness sentence rules
1. Verdict from finger load vs norm and high-load sessions in last 48 h.
2. Downgrade one step if check-ins low for 3+ consecutive days.
3. Force REST FINGERS if any finger niggle status = hurting.
4. Reason clause names at most the two inputs that moved it.

## Assets
No images or icons; glyphs used are text (✓ − +). Fonts from Google Fonts: Archivo, JetBrains Mono. Palette from user-supplied swatch (Wild Strawberry, Powder Petal, Jasmine, Icy Aqua, Tropical Mint) + derived purple.

## Out of scope (from brief)
Accounts, social, exercise GIFs, muscle heatmaps, 1RM, barcode scanning, Apple Health, notifications beyond rest timer, multi-device sync.

## Build order
1. Grade conversion + gym profiles + Log (limit boulder first) → 2. Today + habit dots → 3. Load → 4. Sleep + mindfulness → 5. Food → 6. Tests. JSON export from build 1.

## Files
- `Climbing Tracker.dc.html` — all artboards (open in browser; requires `support.js` beside it).
- `support.js` — runtime for the reference file only; not for production.
