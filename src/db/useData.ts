import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { mergeGyms } from '../domain/gymsRepo';
import { allSessionLoads } from '../domain/fingerLoad';
import type { Gym } from '../grades/gyms';
import { db } from './db';
import type {
  BodyNote, CheckIn, HabitTick, Meal, MealPreset, PlanDay, Problem, Session, SetRow, Sleep, Supplement, SupplementTick, TestResult,
} from './types';

export interface AppData {
  sessions: Session[];
  problems: Problem[];
  setRows: SetRow[];
  checkIns: CheckIn[];
  bodyNotes: BodyNote[];
  sleeps: Sleep[];
  meals: Meal[];
  mealPresets: MealPreset[];
  habitTicks: HabitTick[];
  testResults: TestResult[];
  supplements: Supplement[];
  supplementTicks: SupplementTick[];
  planDays: PlanDay[];
  gyms: Gym[];
  /** Finger load per session id. Derived at read time, never stored. */
  loads: Map<string, number>;
}

/**
 * Everything the read views need, live. One user, small data — loading it
 * all keeps every derived value a pure function of the source rows.
 */
export function useData(): AppData | undefined {
  const raw = useLiveQuery(async () => {
    const [sessions, problems, setRows, checkIns, bodyNotes, sleeps, meals, mealPresets, habitTicks, testResults, supplements, supplementTicks, planDays, gymProfiles] =
      await Promise.all([
        db.sessions.toArray(), db.problems.toArray(), db.setRows.toArray(), db.checkIns.toArray(), db.bodyNotes.toArray(),
        db.sleeps.toArray(), db.meals.toArray(), db.mealPresets.toArray(), db.habitTicks.toArray(), db.testResults.toArray(),
        db.supplements.toArray(), db.supplementTicks.toArray(), db.planDays.toArray(), db.gymProfiles.toArray(),
      ]);
    return { sessions: sessions.filter((s) => s.duration !== undefined), problems, setRows, checkIns, bodyNotes, sleeps, meals, mealPresets, habitTicks, testResults, supplements, supplementTicks, planDays, gymProfiles };
  }, []);
  return useMemo(() => {
    if (!raw) return undefined;
    const { gymProfiles, ...rest } = raw;
    return { ...rest, gyms: mergeGyms(gymProfiles), loads: allSessionLoads(raw.sessions, raw.problems, raw.setRows) };
  }, [raw]);
}
