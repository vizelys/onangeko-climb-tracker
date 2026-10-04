import type { ISODate, Problem, Session, SetRow } from '../db/types';
import { fontIndex } from '../grades/scale';
import { ARCHETYPE_INFO } from './archetypes';
import { addDays, daysBetween } from './dates';
import { quantile } from './stats';

/**
 * Finger load = archetypeWeight × volume × intensity. Arbitrary units —
 * consistency matters, precision does not (SPEC §5, §11). Do not tune this
 * toward physiological accuracy.
 */

export const DEFAULT_RPE = 7;
const TOP_WINDOW_DAYS = 56;
const BODY_CONSTANT_KG = 70;

function groupBy<T>(items: T[], key: (t: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    const list = m.get(k);
    if (list) list.push(it);
    else m.set(k, [it]);
  }
  return m;
}

/** Hardest sent grade index in the 8 weeks before `date`, or null. */
function priorTopIndex(
  date: ISODate,
  sessions: Session[],
  problemsBySession: Map<string, Problem[]>,
): number | null {
  let top: number | null = null;
  for (const s of sessions) {
    const age = daysBetween(s.date, date);
    if (age <= 0 || age > TOP_WINDOW_DAYS) continue;
    for (const p of problemsBySession.get(s.id) ?? []) {
      if (p.outcome === 'project') continue;
      const i = fontIndex(p.gradeCanonical);
      if (top === null || i > top) top = i;
    }
  }
  return top;
}

function limitVolumeIntensity(problems: Problem[], top: number | null): [number, number] {
  const attempts = problems.reduce((a, p) => a + p.attempts, 0);
  if (attempts === 0) return [0, 0];
  const ref = top ?? Math.max(...problems.map((p) => fontIndex(p.gradeCanonical)));
  const weighted = problems.reduce(
    (a, p) => a + p.attempts * ((fontIndex(p.gradeCanonical) + 1) / (ref + 1)),
    0,
  );
  return [attempts, weighted / attempts];
}

function hangVolumeIntensity(rows: SetRow[]): [number, number] {
  let seconds = 0;
  let weighted = 0;
  for (const r of rows) {
    const s = r.sets * r.reps * (r.durationSec ?? 0);
    seconds += s;
    weighted += s * (1 + (r.load ?? 0) / BODY_CONSTANT_KG);
  }
  if (seconds === 0) return [0, 0];
  return [seconds / 10, weighted / seconds];
}

export function sessionFingerLoad(
  session: Session,
  problems: Problem[],
  rows: SetRow[],
  top: number | null,
): number {
  const weight = ARCHETYPE_INFO[session.archetype].weight;
  if (weight === 0) return 0;
  let volume: number;
  let intensity: number;
  switch (session.archetype) {
    case 'limit':
      [volume, intensity] = limitVolumeIntensity(problems, top);
      break;
    case 'hangboard':
      [volume, intensity] = hangVolumeIntensity(rows);
      break;
    default:
      volume = session.duration ?? 0;
      intensity = (session.rpe ?? DEFAULT_RPE) / 10;
  }
  return weight * volume * intensity;
}

/** Finger load for every session, keyed by session id. Computed, never stored. */
export function allSessionLoads(
  sessions: Session[],
  problems: Problem[],
  rows: SetRow[],
): Map<string, number> {
  const pBy = groupBy(problems, (p) => p.sessionId);
  const rBy = groupBy(rows, (r) => r.sessionId);
  const out = new Map<string, number>();
  for (const s of sessions) {
    const top = s.archetype === 'limit' ? priorTopIndex(s.date, sessions, pBy) : null;
    out.set(s.id, sessionFingerLoad(s, pBy.get(s.id) ?? [], rBy.get(s.id) ?? [], top));
  }
  return out;
}

export function loadByDate(sessions: Session[], loads: Map<string, number>): Map<ISODate, number> {
  const m = new Map<ISODate, number>();
  for (const s of sessions) m.set(s.date, (m.get(s.date) ?? 0) + (loads.get(s.id) ?? 0));
  return m;
}

export interface TracePoint {
  date: ISODate;
  value: number;
}

/** Rolling 7-day sum, one point per day, `days` ending on `today`. */
export function rollingTrace(byDate: Map<ISODate, number>, today: ISODate, days = 28): TracePoint[] {
  const out: TracePoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    let value = 0;
    for (let k = 0; k < 7; k++) value += byDate.get(addDays(date, -k)) ?? 0;
    out.push({ date, value });
  }
  return out;
}

export interface NormBand {
  q1: number;
  q3: number;
}

/** The user's own 4-week IQR of the rolling trace. */
export function normBand(trace: TracePoint[]): NormBand {
  const v = trace.map((t) => t.value);
  return { q1: quantile(v, 0.25), q3: quantile(v, 0.75) };
}

/** A session is high-load at or above the 75th percentile of the last 28 days' loaded sessions. */
export function highLoadThreshold(sessions: Session[], loads: Map<string, number>, today: ISODate): number {
  const recent = sessions
    .filter((s) => {
      const age = daysBetween(s.date, today);
      return age >= 0 && age < 28;
    })
    .map((s) => loads.get(s.id) ?? 0)
    .filter((l) => l > 0);
  return recent.length === 0 ? Infinity : quantile(recent, 0.75);
}
