# Climbing-first life tracker

Personal iPhone PWA. Logs climbing, strength, running, food, sleep and
mindfulness around climbing primitives — grade, moves, hang time, finger load.

Single user. Offline. No accounts, no backend.

## Start here

- **`SPEC.md`** — product and design specification. Source of truth. §11 holds
  the decisions settled on 4 Oct 2026.
- **`CLAUDE.md`** — conventions and guardrails for working in this repo.
- **`docs/`** — the Claude Design handoff. Open `*.dc.html` in a browser with
  `support.js` beside it. Design reference, not production code.

## Run

```bash
npm install
npm run dev       # http://localhost:5173, also on your LAN for the phone
npm test          # vitest
npm run typecheck
npm run build     # dist/, with service worker + manifest
```

## Install on the iPhone

1. In GitHub › Settings › Pages, set **Source: GitHub Actions** (once).
2. Push to `main`. The `Deploy to GitHub Pages` workflow tests, builds and
   publishes to `https://vizelys.github.io/onangeko-climb-tracker/`.
3. Open that URL in Safari › Share › **Add to Home Screen**.

Data lives in the phone's IndexedDB. Export a JSON backup from Me › Export /
import now and then — Safari can evict storage for web apps you stop opening.

## Layout

| Path | What |
| --- | --- |
| `src/grades/` | Font scale, gym profiles, picker conversion. Built first, tested. |
| `src/db/` | Dexie schema (v1), types, export/import, live-query hooks, write actions |
| `src/domain/` | Pure derived values: finger load, readiness, pyramid, sleep, fuel, tests |
| `src/forms/` | Limit boulder form (critical path) and the other archetype forms |
| `src/screens/` | Today, Log, Load, Tests, Me (+ `me/` sub-pages) |
| `src/sheets/`, `src/ui/` | Bottom sheets, toast, shared styles |

## Status

| Area | State |
| --- | --- |
| Grades | Built, tested |
| Persistence + JSON export/import | Built, tested |
| Limit boulder form, gym sheet, end/RPE sheet | Built — **needs the real-phone 6-in-60s check** |
| Other archetype forms (intervals, circuits, hangboard, strength, run) | Built |
| Today, Load, Tests, Me | Built |
| Food: presets, manual ranges, optional Gemini text/photo estimate | Built |
| Gym editor (Me › Gyms) | Built. The Roof stays provisional until confirmed. |
