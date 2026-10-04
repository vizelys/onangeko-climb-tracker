# Climbing-first life tracker

Personal iPhone PWA. Logs climbing, strength, running, food, sleep and
mindfulness around climbing primitives — grade, moves, hang time, finger load.

Single user. Offline. No accounts, no backend.

## Start here

- **`SPEC.md`** — product and design specification. Source of truth.
- **`CLAUDE.md`** — conventions and guardrails for working in this repo.
- **`docs/`** — the Claude Design handoff. Open `*.dc.html` in a browser with
  `support.js` beside it. Design reference, not production code.

## Run

```bash
npm install
npm test          # 19 tests, all passing
npx tsc --noEmit  # typecheck
```

## Status

| Area | State |
| --- | --- |
| `src/grades/` — scale, gym profiles, picker conversion | Built, tested |
| Persistence (Dexie) | Not started — next |
| Limit boulder form | Not started |
| Today, Load, Tests, Me | Not started |

Build order and acceptance criteria are in `SPEC.md` §8.
