# Climbing-first life tracker — specification

Single source of truth. Merges the product brief, the Claude Design handoff and
the decisions already settled in `src/grades/`. Where this file and anything
else disagree, this file wins.

**Status:** `src/grades/` is built and tested. Everything else is unbuilt.

---

## 1. What this is

One app, one user, one iPhone. Logs climbing, strength, running, food, sleep and
mindfulness around climbing-native primitives — grade, moves, hang time, finger
load — instead of the sets × reps × kilos model every general fitness app uses.

**Its job:** make the right next session obvious on a Monday morning.

There is no second persona. No onboarding, no marketing empty states, no
accounts. Every screen may assume a climber who knows what a campus board is.

---

## 2. Principles

These settle design arguments. Cite them in PR descriptions.

1. **Grade is the intensity axis, not load.** A boulder problem has a grade, an
   attempt count and an outcome. It does not have a weight.
2. **Logging beats accuracy.** Default every field. Never block a save on a
   missing value. Everything is editable afterwards.
3. **Fuel, not deficit.** No calorie-deficit target, no weight-goal line, no red
   numbers on food, no streak pressure on eating. Calories answer "did I fuel
   this week", not "did I stay under a cap". This is deliberate: in climbing,
   disordered eating roughly doubles injury likelihood, and body-fat percentage
   is the weakest predictor of performance compared with finger-hang, bent-arm
   hang, grip strength and climbing volume.
4. **Finger load is its own axis.** Fingers and shoulders are the most frequent
   climbing injury sites. Finger-flexor exposure is tracked separately from
   general training load.
5. **Every number earns its screen space.** If you cannot name the Monday-morning
   question a view answers, it does not ship.
6. **The data is yours and leaves easily.** JSON export from build 1.

---

## 3. Hard constraints

| Constraint | Consequence |
| --- | --- |
| iPhone only, portrait, 390pt design width | No desktop layout. No landscape. |
| Dark theme only | No theme toggle. `prefers-color-scheme` is ignored. |
| PWA from Safari, or Capacitor | No App Store review. No HealthKit write. No widgets. |
| Offline by default | Every write hits IndexedDB immediately. Nothing blocks on network. |
| Used standing in a gym, chalky hands | Hit targets ≥ 44×44pt. Primary actions in the bottom half. |
| Boulder entry ≤ 10s, target 3s | The grade picker is the critical path. Optimise it over everything. |

**Motion budget:** 150ms opacity fade for confirmations and scrims; 250ms
ease-out for sheet slides. No springs, confetti, badges or celebration. A
confirmation is one line of text that disappears after 1.8s.

---

## 4. Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Build | Vite + React + TypeScript | Fast, boring, PWA plugin available |
| Storage | IndexedDB via Dexie | Offline-first, survives refresh, queryable |
| State | React state + Dexie live queries | No Redux. Single user, small data. |
| Styling | CSS custom properties + CSS modules | Tokens in `tokens.css`, no runtime CSS-in-JS |
| Tests | Vitest | Already configured and passing |
| Backend | None | If one ever arrives, it syncs the same JSON document |

No component library. The design is specific enough that Material or shadcn
would cost more in overrides than it saves.

---

## 5. Data model

Thirteen entities. **Everything on the Load tab is computed at read time.**
Nothing aggregated is stored, so correcting a session retroactively fixes every
chart.

| Entity | Fields |
| --- | --- |
| `Session` | id, date, archetype, duration, rpe, gymId?, notes |
| `Problem` | sessionId, gradeCanonical, gradeAsEntered, attempts, outcome |
| `SetRow` | sessionId, exercise, sets, reps, load?, rir?, durationSec? |
| `Meal` | date, slot, components[], size, presetId?, estimate?, estimateSource, photoRef? |
| `Sleep` | date, bedtime, wake, quality? |
| `CheckIn` | date, energy, soreness, motivation, note? |
| `HabitTick` | date, habit, done, durationSec? |
| `TestResult` | date, testId, value, unit, conditions? |
| `Equipment` | id, name, attributes |
| `ExercisePref` | exerciseId, rating |
| `BodyNote` | date, kind, area?, text, status? |
| `Supplement` | id, name, dose, schedule, startDate? |
| `SupplementTick` | date, supplementId, taken |

Notes:

- `archetype` ∈ `limit | intervals | circuits | hangboard | strength | run`
- `outcome` ∈ `flash | send | project`
- `estimateSource` ∈ `preset | text | photo | manual`; `estimate` is a **kcal
  range**, never a point value
- `BodyNote.kind` ∈ `weakness | niggle`; `status` applies only to niggles and is
  `watching | hurting | resolved`
- `ExercisePref.rating` ∈ `liked | neutral | disliked | never`

### Derived, never stored

Finger load per session and its 28-day rolling trace · general load (RPE × min) ·
grade pyramid · readiness sentence · sleep debt and wake drift · intake band vs
demand · available exercise list (equipment filtered by preference).

### Finger-load formula

`archetypeWeight × volume × intensity`, where archetype weights are:

| Archetype | Weight |
| --- | --- |
| hangboard | 1.0 |
| limit | 0.8 |
| intervals | 0.5 |
| circuits | 0.25 |
| strength, run | 0 |

Rolling 7-day sum, plotted over 28 days. The norm band is the user's own 4-week
IQR. Units are arbitrary; **consistency matters, precision does not.** The only
decision it supports: whether a second high-finger-load session this week is
wise.

---

## 6. Grades

Already implemented in `src/grades/`. Read that code before touching this area.

- **Font is canonical.** V-scale is display only. The V mapping is many-to-one
  (6A and 6A+ are both V3), so round-tripping through V loses information.
- **Store `gradeCanonical` and `gradeAsEntered`.** Tapping "Rouge" stores `6B+`
  *and* `Rouge`, so a later correction to a gym profile can be audited instead
  of silently rewriting history.
- **Gym is chosen once per session**, persisted on `Session.gymId`.
- **Band selection resets the fine row** to that band's middle,
  `floor((n - 1) / 2)`. A 2-grade band therefore defaults to the easier grade.
- **The Roof profile is `provisional: true`** — the mapping is unconfirmed and a
  test asserts it is the only provisional one. Do not silently promote it.
- 5C maps to V2. Conversion tables leave it blank; a gap reads as a bug.

---

## 7. Screens

Five tabs, flat tab bar. Status bar 47pt, tab bar 84pt.

### Today — "What am I doing today, and did I do it?"

Header (weekday + date/week) · planned session card with archetype accent,
finger-load label, latest relevant weakness note inset, and a 56pt Start button ·
habit dots (stretch, read, guitar, mind) at 52pt · sleep tile and fuel tile ·
how-I-feel row defaulting to yesterday's answers · supplement tick chips.

### Log — "Record what just happened"

Header + gym chip. 2×3 grid of 152pt archetype tiles, each with accent dot, name,
field hint and a 4-segment finger-load meter. Footer shows last logged session.
Tapping a tile opens that archetype full-screen with only its fields.

### Limit boulder form — the critical path

Full-screen, no tab bar. Header with live timer, gym chip and End. Problem list
newest-first, 56pt rows. **Docked picker** at the bottom:

1. Readout: grade at 46px + secondary scale · attempts stepper (default 1)
2. Tag row: colour swatches (56pt, flex) or a 6-column number grid for Block'Out
3. Fine row: one 44pt cell per Font grade, only when the band spans more than one
4. Outcome row: Flash / Send / Project at 64pt

**Tapping an outcome is the save.** It commits the row, resets attempts to 1, and
keeps the band and fine selection for the next problem. Flow: read tag → tap
swatch → tap outcome. Target 3s.

### Load — "Am I ready to go hard?" (read-only)

Readiness sentence · finger-load 4-week chart with norm band · session load
14-day bars · grade pyramid 8 weeks.

**Readiness rules, in order:**

1. Verdict from finger load vs norm and high-load sessions in the last 48h
2. Downgrade one step if check-ins are low 3+ consecutive days
3. Force REST FINGERS if any finger niggle has status `hurting`
4. The reason clause names at most the two inputs that moved it

States: GO (mint), EASE (jasmine), REST FINGERS (strawberry) — the last also
offers an alternative session.

### Tests — "Am I actually getting stronger?"

Benchmark battery with 6-bar history each. Any test older than 8 weeks surfaces a
stale prompt card. Battery: max hang 20mm, bent-arm hang, pull-up max,
finger-flexor critical force.

### Me — sleep, food, mind, profile

Sleep 7-night bars against an 8h dashed target · fuel vs training per day, scale
1500–3500 kcal, neutral sentence for low climbing days · mindfulness summary ·
profile rows: equipment, exercise preferences, weakness notes, niggles. Body
weight row exists but is off by default.

---

## 8. Acceptance criteria by build step

Ship in this order. Each step must pass before the next starts.

### 1. Grades — DONE

19 tests passing, typecheck clean. No further work.

### 2. Persistence

- [ ] Dexie schema matching §5, versioned
- [ ] A logged problem survives a hard refresh
- [ ] JSON export produces a file that re-imports to identical state
- [ ] All writes are synchronous-feeling: no spinner on save

### 3. Limit boulder form

- [ ] Picker wired to `src/grades/convert.ts`, no duplicate conversion logic
- [ ] Outcome tap writes a `Problem` and shows a 1.8s confirmation line
- [ ] Attempts stepper clamps 1–99
- [ ] Gym sheet sets `Session.gymId` and persists across reopen
- [ ] **Measured**: six problems logged in under 60s on a real phone

### 4. Today

- [ ] Habit dots: tap marks done, 500ms long-press undoes
- [ ] No partial states
- [ ] Planned session card reads from the latest relevant `BodyNote`

### 5. Load

- [ ] Finger-load trace computed at read time from sessions, not stored
- [ ] Readiness rules applied in the order given in §7
- [ ] Editing a past session visibly changes the trace

### 6. Sleep, mindfulness, food, tests

- [ ] Food estimates render as ranges, never point values
- [ ] No red numbers anywhere in the food views
- [ ] Stale-test prompt appears at exactly 8 weeks

---

## 9. Out of scope

Accounts, auth, social, sharing, feeds, exercise GIF libraries, muscle
heatmaps, estimated 1RM, barcode scanning, Apple Health, notifications beyond a
rest timer, multi-device sync, landscape, light theme, anything implying a second
user exists.

---

## 10. Open questions

- The Roof's band mapping needs confirming in the gym (currently provisional)
- Gym profile editor UI is unspecified — a list of band name, colour, Font range
- Whether two-grade bands should default to the easier or harder grade
- Whether calorie estimates should ever show a point value on request
