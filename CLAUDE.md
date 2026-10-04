# Working in this repo

Read `SPEC.md` first. It is the single source of truth and it wins over anything
in this file, any comment, or any assumption from a general fitness app.

## Context

Personal app. One user, one iPhone, offline. Not a product — there is no second
user, so do not build for one. No accounts, no onboarding, no empty states
written for a stranger.

The user has roughly 2.5 hours a week for this. Scope discipline matters more
than completeness. A smaller thing that works beats a larger thing that is half
wired up.

## Before you write anything

- `src/grades/` is **built and tested** (19 tests). Do not rewrite it, do not
  duplicate its conversion logic in a component. Import from it.
- Run `npm test` before and after. Do not commit with failing tests.
- `npx tsc --noEmit` must stay clean. `strict` is on and stays on.

## Build order

Follow §8 of `SPEC.md`. Each step has acceptance criteria; meet them before
moving on. Current position: step 1 done, step 2 (persistence) next.

## Conventions

- TypeScript strict. No `any`. No non-null assertions outside tests.
- Pure functions for anything derived. Derived values are **computed at read
  time, never stored** — this is load-bearing, see `SPEC.md` §5.
- Tokens live in `src/styles/tokens.css`. Never hardcode a hex in a component.
- CSS modules for component styles. No runtime CSS-in-JS.
- Co-locate tests as `*.test.ts` beside the code.

## Things that are deliberate, not oversights

If one of these looks wrong, it is intentional. Ask before changing it.

- **No red numbers on food, ever.** No deficit target, no weight-goal line. See
  `SPEC.md` §2 principle 3 — this is a safety decision, not an aesthetic one.
- **Food estimates are ranges**, never point values.
- **Font is canonical, V is display-only.** Never store a V grade.
- **`gradeAsEntered` is stored alongside `gradeCanonical`.** Both, always.
- **The Roof gym profile is `provisional: true`** and a test enforces that it is
  the only one. Do not remove the flag to make the test simpler.
- **No celebration animation.** Confirmations are one line of text.
- Finger-load units are arbitrary. Consistency matters, precision does not. Do
  not "improve" the formula toward physiological accuracy.

## Performance target that actually matters

Six problems logged in under 60 seconds, on a real phone, one-handed, in a dim
gym. If a change makes the picker slower to use, it is a regression regardless
of what else it improves.

## What not to add

Accounts, social, sharing, exercise GIF libraries, muscle heatmaps, 1RM
estimation, barcode scanning, Apple Health, notifications beyond a rest timer,
multi-device sync, landscape layout, light theme, a component library.
