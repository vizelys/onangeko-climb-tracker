import type { Archetype, BodyNote, CheckIn, ISODate, PlanDay, Session } from '../db/types';
import { ARCHETYPE_INFO } from './archetypes';
import { addDays, daysBetween } from './dates';
import type { NormBand, TracePoint } from './fingerLoad';

export type ReadinessState = 'GO' | 'EASE' | 'REST';

export interface Readiness {
  state: ReadinessState;
  verdict: string;
  reason: string;
  alternative?: string;
}

export interface ReadinessInput {
  today: ISODate;
  trace: TracePoint[];
  norm: NormBand;
  sessions: Session[];
  loads: Map<string, number>;
  highThreshold: number;
  checkIns: CheckIn[];
  bodyNotes: BodyNote[];
}

const VERDICT: Record<ReadinessState, string> = {
  GO: 'Good day to pull hard.',
  EASE: 'Keep fingers sub-maximal today.',
  REST: 'Rest your fingers today.',
};
const LEVELS: ReadinessState[] = ['GO', 'EASE', 'REST'];

/** A low day: at least two of energy low, soreness high, motivation low. */
export function isLowCheckIn(c: CheckIn): boolean {
  return [c.energy === 'low', c.soreness === 'high', c.motivation === 'low'].filter(Boolean).length >= 2;
}

/** Consecutive low days ending today, or yesterday when today is not in yet. */
export function lowCheckInStreak(checkIns: CheckIn[], today: ISODate): number {
  const by = new Map(checkIns.map((c) => [c.date, c]));
  let day = by.has(today) ? today : addDays(today, -1);
  let n = 0;
  for (;;) {
    const c = by.get(day);
    if (!c || !isLowCheckIn(c)) return n;
    n++;
    day = addDays(day, -1);
  }
}

function sentence(parts: string[]): string {
  const s = parts.slice(0, 2).join(' and ');
  return s.charAt(0).toUpperCase() + s.slice(1) + '.';
}

/** SPEC §7 readiness rules, applied in order. */
export function readiness(input: ReadinessInput): Readiness {
  const { today, trace, norm, sessions, loads, highThreshold, checkIns, bodyNotes } = input;

  // Rule 1 — finger load vs norm, and hard sessions in the last 48h.
  const current = trace.length ? trace[trace.length - 1].value : 0;
  const hard48 = sessions.filter((s) => {
    const age = daysBetween(s.date, today);
    return age >= 0 && age <= 1 && (loads.get(s.id) ?? 0) >= highThreshold;
  }).length;
  const iqr = norm.q3 - norm.q1;
  let level = 0;
  let base: string[];
  if (hard48 >= 2) {
    level = 2;
    base = ['two hard finger sessions in 48h'];
  } else if (norm.q3 > 0 && current > norm.q3 + iqr) {
    level = 2;
    base = ['finger load is well above your 4-week norm'];
  } else if (hard48 === 1) {
    level = 1;
    base = ['you had a hard finger session in the last 48h'];
  } else if (norm.q3 > 0 && current > norm.q3) {
    level = 1;
    base = ['finger load is above your 4-week norm'];
  } else {
    base = ['finger load is inside your norm', 'nothing hard in 48h'];
  }

  const baseLevel = level;

  // Inputs that moved the verdict after rule 1, latest rule first.
  const moved: string[] = [];

  // Rule 2 — low check-ins 3+ consecutive days.
  if (lowCheckInStreak(checkIns, today) >= 3) {
    level = Math.min(2, level + 1);
    moved.unshift('check-ins have been low three days running');
  }
  // §11: wrist or elbow hurting also downgrades one step.
  const hurting = bodyNotes.filter((n) => n.kind === 'niggle' && n.status === 'hurting');
  const joint = hurting.find((n) => n.area === 'wrist' || n.area === 'elbow');
  if (joint) {
    level = Math.min(2, level + 1);
    moved.unshift(`your ${joint.area} is hurting`);
  }

  // Rule 3 — any finger niggle hurting forces REST.
  const finger = hurting.find((n) => n.area === 'finger');
  if (finger) {
    level = 2;
    moved.unshift(`${finger.text || 'a finger niggle'} is hurting`);
  }

  // Rule 4 — at most two inputs in the reason.
  // A GO base reason did not move anything, so it only fills in when nothing else did.
  const reasons = baseLevel > 0 || moved.length === 0 ? [...moved, ...base] : moved;
  const state = LEVELS[level];
  return {
    state,
    verdict: VERDICT[state],
    reason: sentence(reasons),
    alternative: state === 'REST' ? 'Strength or an easy run instead.' : undefined,
  };
}

/** Today's planned archetype, swapped down when readiness says so (§11). */
export function adjustPlan(plan: PlanDay | undefined, state: ReadinessState): Archetype | 'rest' {
  const a = plan?.archetype ?? 'rest';
  if (a === 'rest') return a;
  const w = ARCHETYPE_INFO[a].weight;
  if (state === 'REST' && w > 0) return 'strength';
  if (state === 'EASE' && w >= 0.5) return 'circuits';
  return a;
}
