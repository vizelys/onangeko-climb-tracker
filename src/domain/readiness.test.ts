import { describe, expect, it } from 'vitest';
import type { BodyNote, CheckIn, Session } from '../db/types';
import { adjustPlan, lowCheckInStreak, readiness, type ReadinessInput } from './readiness';

const today = '2026-10-05';
const flat = Array.from({ length: 28 }, (_, i) => ({ date: String(i), value: 10 + (i % 5) }));
const base: ReadinessInput = {
  today,
  trace: flat,
  norm: { q1: 11, q3: 13 },
  sessions: [],
  loads: new Map(),
  highThreshold: 20,
  checkIns: [],
  bodyNotes: [],
};
const sess = (id: string, date: string): Session => ({ id, date, archetype: 'limit', startedAt: 0 });
const low = (date: string): CheckIn => ({ date, energy: 'low', soreness: 'high', motivation: 'ok' });
const niggle = (area: BodyNote['area'], status: BodyNote['status']): BodyNote => ({ id: area ?? 'x', date: today, kind: 'niggle', area, text: 'L ring A2', status });

describe('readiness', () => {
  it('GO inside the norm with nothing hard', () => {
    const r = readiness({ ...base, trace: [...flat.slice(0, -1), { date: today, value: 12 }] });
    expect(r.state).toBe('GO');
    expect(r.reason).toBe('Finger load is inside your norm and nothing hard in 48h.');
  });

  it('EASE after one hard session in 48h', () => {
    const r = readiness({ ...base, sessions: [sess('a', '2026-10-04')], loads: new Map([['a', 25]]) });
    expect(r.state).toBe('EASE');
  });

  it('REST after two hard sessions in 48h', () => {
    const r = readiness({
      ...base,
      sessions: [sess('a', '2026-10-04'), sess('b', today)],
      loads: new Map([['a', 25], ['b', 30]]),
    });
    expect(r.state).toBe('REST');
    expect(r.alternative).toBeDefined();
  });

  it('three low check-ins downgrade one step', () => {
    const r = readiness({ ...base, checkIns: [low('2026-10-03'), low('2026-10-04'), low(today)] });
    expect(r.state).toBe('EASE');
    expect(r.reason).toMatch(/check-ins/i);
  });

  it('streak counts from yesterday when today is not in', () => {
    expect(lowCheckInStreak([low('2026-10-02'), low('2026-10-03'), low('2026-10-04')], today)).toBe(3);
  });

  it('a hurting finger niggle forces REST regardless', () => {
    const r = readiness({ ...base, bodyNotes: [niggle('finger', 'hurting')] });
    expect(r.state).toBe('REST');
    expect(r.reason.startsWith('L ring A2 is hurting')).toBe(true);
  });

  it('a watched finger niggle does not', () => {
    expect(readiness({ ...base, bodyNotes: [niggle('finger', 'watching')] }).state).toBe('GO');
  });

  it('reason names at most two inputs', () => {
    const r = readiness({
      ...base,
      sessions: [sess('a', '2026-10-04')],
      loads: new Map([['a', 25]]),
      checkIns: [low('2026-10-03'), low('2026-10-04'), low(today)],
      bodyNotes: [niggle('finger', 'hurting'), niggle('wrist', 'hurting')],
    });
    expect(r.reason.split(' and ').length).toBeLessThanOrEqual(2);
  });

  it('swaps a hard plan down', () => {
    expect(adjustPlan({ weekday: 0, archetype: 'limit' }, 'EASE')).toBe('circuits');
    expect(adjustPlan({ weekday: 0, archetype: 'hangboard' }, 'REST')).toBe('strength');
    expect(adjustPlan({ weekday: 0, archetype: 'run' }, 'REST')).toBe('run');
  });
});
