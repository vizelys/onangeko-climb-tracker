import type { Archetype, ISODate, KcalRange, Meal, Problem, Session, Sleep, TestResult } from '../db/types';
import { FONT_GRADES, fontIndex, type FontGrade } from '../grades/scale';
import { addDays, clockToMin, daysBetween } from './dates';

// ---------- Grade pyramid ----------

export interface PyramidRow {
  grade: FontGrade;
  sends: number;
  projects: number;
}

/** Hardest first, over the last `weeks` weeks. Only grades with any problems. */
export function gradePyramid(sessions: Session[], problems: Problem[], today: ISODate, weeks = 8): PyramidRow[] {
  const inWindow = new Set(
    sessions.filter((s) => {
      const age = daysBetween(s.date, today);
      return age >= 0 && age < weeks * 7;
    }).map((s) => s.id),
  );
  const rows = new Map<FontGrade, PyramidRow>();
  for (const p of problems) {
    if (!inWindow.has(p.sessionId)) continue;
    const r = rows.get(p.gradeCanonical) ?? { grade: p.gradeCanonical, sends: 0, projects: 0 };
    if (p.outcome === 'project') r.projects++;
    else r.sends++;
    rows.set(p.gradeCanonical, r);
  }
  return [...rows.values()].sort((a, b) => fontIndex(b.grade) - fontIndex(a.grade));
}

// ---------- General session load ----------

export interface DayLoad {
  date: ISODate;
  load: number;
  /** Archetype contributing the most load that day, for the bar colour. */
  archetype?: Archetype;
}

export function sessionLoad(s: Session): number {
  return (s.rpe ?? 7) * (s.duration ?? 0);
}

export function dailySessionLoad(sessions: Session[], today: ISODate, days = 14): DayLoad[] {
  const out: DayLoad[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const day = sessions.filter((s) => s.date === date && s.duration !== undefined);
    let best: Session | undefined;
    for (const s of day) if (!best || sessionLoad(s) > sessionLoad(best)) best = s;
    out.push({ date, load: day.reduce((a, s) => a + sessionLoad(s), 0), archetype: best?.archetype });
  }
  return out;
}

// ---------- Sleep ----------

/** Minutes asleep. Bedtime after wake means you went to bed the previous evening. */
export function sleepMinutes(s: Sleep): number {
  const bed = clockToMin(s.bedtime);
  const wake = clockToMin(s.wake);
  return wake >= bed ? wake - bed : 24 * 60 - bed + wake;
}

export function formatHm(min: number): { h: string; m: string } {
  const r = Math.round(min);
  return { h: String(Math.floor(r / 60)), m: String(r % 60).padStart(2, '0') };
}

export const SLEEP_TARGET_MIN = 8 * 60;
export const SLEEP_GOOD_MIN = 7.5 * 60;

/** Signed minutes of wake time vs the alarm. Positive = later than alarm. */
export function wakeDrift(s: Sleep, alarm: string): number {
  return clockToMin(s.wake) - clockToMin(alarm);
}

export function sleepDebt(sleeps: Sleep[], today: ISODate, nights = 7): number {
  let debt = 0;
  for (let i = 0; i < nights; i++) {
    const s = sleeps.find((x) => x.date === addDays(today, -i));
    if (s) debt += SLEEP_TARGET_MIN - sleepMinutes(s);
  }
  return debt;
}

// ---------- Fuel ----------

export function sumRanges(meals: Meal[]): KcalRange {
  return meals.reduce(
    (a, m) => (m.estimate ? { low: a.low + m.estimate.low, high: a.high + m.estimate.high } : a),
    { low: 0, high: 0 },
  );
}

export function formatKcalRange(r: KcalRange): string {
  const k = (n: number) => (n / 1000).toFixed(1);
  if (r.low === 0 && r.high === 0) return '—';
  return `${k(r.low)}–${k(r.high)}k`;
}

/** A training day needs the training range (§11). */
export function isTrainingDay(date: ISODate, sessions: Session[], loads: Map<string, number>): boolean {
  return sessions.some((s) => s.date === date && ((loads.get(s.id) ?? 0) > 0 || (s.duration ?? 0) >= 45));
}

// ---------- Benchmark tests ----------

export interface BenchmarkTest {
  id: string;
  name: string;
  unit: string;
  conditions: string;
  /** For the delta: is a bigger number better? */
  higherIsBetter: boolean;
}

export const BATTERY: BenchmarkTest[] = [
  { id: 'maxhang20', name: 'Max hang, 20 mm', unit: 'kg', conditions: '10 s · half crimp · added weight', higherIsBetter: true },
  { id: 'bentarm', name: 'Bent-arm hang', unit: 's', conditions: 'Jug · 90° elbows', higherIsBetter: true },
  { id: 'pullup', name: 'Pull-up max', unit: 'reps', conditions: 'Strict · bar', higherIsBetter: true },
  { id: 'cf', name: 'Finger-flexor critical force', unit: 'kg', conditions: '7:3 repeaters · 4 min', higherIsBetter: true },
];

export const STALE_DAYS = 56;

export function latestResult(results: TestResult[], testId: string): TestResult | undefined {
  return results
    .filter((r) => r.testId === testId)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
}

/** Stale at exactly 8 weeks (56 days) since the last result. Never-run tests are not stale. */
export function isStale(latest: TestResult | undefined, today: ISODate): boolean {
  return latest !== undefined && daysBetween(latest.date, today) >= STALE_DAYS;
}

export { FONT_GRADES };
