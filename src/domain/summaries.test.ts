import { describe, expect, it } from 'vitest';
import type { Meal, Problem, Session, TestResult } from '../db/types';
import { formatKcalRange, gradePyramid, isStale, sleepMinutes, sumRanges, wakeDrift } from './summaries';

describe('summaries', () => {
  it('pyramid counts sends and projects, hardest first, inside 8 weeks', () => {
    const sessions: Session[] = [
      { id: 'a', date: '2026-10-01', archetype: 'limit', startedAt: 0 },
      { id: 'old', date: '2026-07-01', archetype: 'limit', startedAt: 0 },
    ];
    const mk = (sessionId: string, g: Problem['gradeCanonical'], outcome: Problem['outcome']): Problem => ({
      id: Math.random().toString(), sessionId, gradeCanonical: g, gradeAsEntered: g, attempts: 1, outcome, loggedAt: 0,
    });
    const rows = gradePyramid(sessions, [mk('a', '6C', 'send'), mk('a', '7A', 'project'), mk('a', '6C', 'flash'), mk('old', '7B', 'send')], '2026-10-05');
    expect(rows).toEqual([
      { grade: '7A', sends: 0, projects: 1 },
      { grade: '6C', sends: 2, projects: 0 },
    ]);
  });

  it('sleep crosses midnight', () => {
    expect(sleepMinutes({ date: 'x', bedtime: '23:10', wake: '06:52' })).toBe(462);
    expect(wakeDrift({ date: 'x', bedtime: '23:10', wake: '06:52' }, '06:45')).toBe(7);
  });

  it('fuel is always a range', () => {
    const meals: Meal[] = [
      { id: '1', date: 'd', slot: 'lunch', components: [], size: 'normal', estimate: { low: 600, high: 800 }, estimateSource: 'manual' },
      { id: '2', date: 'd', slot: 'snack', components: [], size: 'small', estimate: { low: 800, high: 900 }, estimateSource: 'preset' },
    ];
    const r = sumRanges(meals);
    expect(r).toEqual({ low: 1400, high: 1700 });
    expect(formatKcalRange(r)).toBe('1.4–1.7k');
  });

  it('a test goes stale at exactly 8 weeks', () => {
    const r = (date: string): TestResult => ({ id: '1', date, testId: 'maxhang20', value: 18, unit: 'kg' });
    expect(isStale(r('2026-08-10'), '2026-10-04')).toBe(false); // 55 days
    expect(isStale(r('2026-08-09'), '2026-10-04')).toBe(true); // 56 days
    expect(isStale(undefined, '2026-10-04')).toBe(false);
  });
});
