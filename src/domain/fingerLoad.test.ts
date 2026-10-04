import { describe, expect, it } from 'vitest';
import type { Problem, Session, SetRow } from '../db/types';
import { allSessionLoads, loadByDate, normBand, rollingTrace, sessionFingerLoad } from './fingerLoad';

const s = (over: Partial<Session> & Pick<Session, 'id' | 'archetype' | 'date'>): Session => ({
  startedAt: 0,
  duration: 60,
  rpe: 7,
  ...over,
});
const p = (sessionId: string, grade: Problem['gradeCanonical'], attempts: number, outcome: Problem['outcome'] = 'send'): Problem => ({
  id: `${sessionId}-${grade}-${attempts}-${outcome}`,
  sessionId,
  gradeCanonical: grade,
  gradeAsEntered: grade,
  attempts,
  outcome,
  loggedAt: 0,
});

describe('finger load', () => {
  it('strength and run carry none', () => {
    expect(sessionFingerLoad(s({ id: 'a', archetype: 'strength', date: '2026-10-01' }), [], [], null)).toBe(0);
    expect(sessionFingerLoad(s({ id: 'a', archetype: 'run', date: '2026-10-01' }), [], [], null)).toBe(0);
  });

  it('circuits = 0.25 × minutes × rpe/10', () => {
    const v = sessionFingerLoad(s({ id: 'a', archetype: 'circuits', date: '2026-10-01', duration: 40, rpe: 5 }), [], [], null);
    expect(v).toBeCloseTo(0.25 * 40 * 0.5);
  });

  it('limit: attempts × relative grade, against this session when no history', () => {
    const sess = s({ id: 'L', archetype: 'limit', date: '2026-10-01' });
    // Both at the session top → intensity 1.
    const v = sessionFingerLoad(sess, [p('L', '7A', 2), p('L', '7A', 3)], [], null);
    expect(v).toBeCloseTo(0.8 * 5 * 1);
  });

  it('limit uses the prior 8-week top send, so a harder project raises load', () => {
    const old = s({ id: 'O', archetype: 'limit', date: '2026-09-20' });
    const now = s({ id: 'N', archetype: 'limit', date: '2026-10-01' });
    const loads = allSessionLoads([old, now], [p('O', '7A', 1), p('N', '7A', 2), p('N', '7B', 2, 'project')], []);
    expect(loads.get('N')).toBeGreaterThan(0.8 * 4);
  });

  it('hangboard scales with seconds and added weight', () => {
    const sess = s({ id: 'H', archetype: 'hangboard', date: '2026-10-01' });
    const rows: SetRow[] = [{ id: 'r', sessionId: 'H', exercise: '20mm', sets: 6, reps: 1, durationSec: 10, load: 14 }];
    expect(sessionFingerLoad(sess, [], rows, null)).toBeCloseTo(1.0 * 6 * 1.2);
  });

  it('rolling trace sums the last 7 days and recomputes from source data', () => {
    const sessions = [s({ id: 'a', archetype: 'circuits', date: '2026-09-28', duration: 40, rpe: 10 })];
    const loads = allSessionLoads(sessions, [], []);
    const trace = rollingTrace(loadByDate(sessions, loads), '2026-10-04', 10);
    expect(trace.find((t) => t.date === '2026-09-28')?.value).toBe(10);
    expect(trace.find((t) => t.date === '2026-10-04')?.value).toBe(10);
    expect(trace.find((t) => t.date === '2026-09-27')?.value).toBe(0);

    // Editing the session changes the trace — nothing is cached.
    sessions[0] = { ...sessions[0], duration: 80 };
    const again = rollingTrace(loadByDate(sessions, allSessionLoads(sessions, [], [])), '2026-10-04', 10);
    expect(again.find((t) => t.date === '2026-10-04')?.value).toBe(20);
  });

  it('norm band is the IQR', () => {
    const band = normBand([1, 2, 3, 4, 5].map((value, i) => ({ date: String(i), value })));
    expect(band).toEqual({ q1: 2, q3: 4 });
  });
});
