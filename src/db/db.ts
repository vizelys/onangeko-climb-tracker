import Dexie, { type EntityTable } from 'dexie';
import type {
  BodyNote,
  CheckIn,
  Equipment,
  ExercisePref,
  GymProfile,
  HabitTick,
  Meal,
  MealPreset,
  PlanDay,
  Problem,
  Session,
  SetRow,
  Setting,
  Sleep,
  Supplement,
  SupplementTick,
  TestResult,
} from './types';

export class TrackerDB extends Dexie {
  sessions!: EntityTable<Session, 'id'>;
  problems!: EntityTable<Problem, 'id'>;
  setRows!: EntityTable<SetRow, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  mealPresets!: EntityTable<MealPreset, 'id'>;
  sleeps!: EntityTable<Sleep, 'date'>;
  checkIns!: EntityTable<CheckIn, 'date'>;
  habitTicks!: Dexie.Table<HabitTick, [string, string]>;
  testResults!: EntityTable<TestResult, 'id'>;
  equipment!: EntityTable<Equipment, 'id'>;
  exercisePrefs!: EntityTable<ExercisePref, 'exerciseId'>;
  bodyNotes!: EntityTable<BodyNote, 'id'>;
  supplements!: EntityTable<Supplement, 'id'>;
  supplementTicks!: Dexie.Table<SupplementTick, [string, string]>;
  planDays!: EntityTable<PlanDay, 'weekday'>;
  gymProfiles!: EntityTable<GymProfile, 'id'>;
  settings!: EntityTable<Setting, 'key'>;

  constructor(name = 'climbing-tracker') {
    super(name);
    // Bump the version and add a new `stores` block for any schema change.
    // Never edit a shipped version in place.
    this.version(1).stores({
      sessions: 'id, date, archetype',
      problems: 'id, sessionId',
      setRows: 'id, sessionId',
      meals: 'id, date',
      mealPresets: 'id',
      sleeps: 'date',
      checkIns: 'date',
      habitTicks: '[date+habit], date',
      testResults: 'id, testId, date',
      equipment: 'id',
      exercisePrefs: 'exerciseId',
      bodyNotes: 'id, date, kind',
      supplements: 'id',
      supplementTicks: '[date+supplementId], date',
      planDays: 'weekday',
      gymProfiles: 'id',
      settings: 'key',
    });
  }
}

export const TABLE_NAMES = [
  'sessions',
  'problems',
  'setRows',
  'meals',
  'mealPresets',
  'sleeps',
  'checkIns',
  'habitTicks',
  'testResults',
  'equipment',
  'exercisePrefs',
  'bodyNotes',
  'supplements',
  'supplementTicks',
  'planDays',
  'gymProfiles',
  'settings',
] as const;
export type TableName = (typeof TABLE_NAMES)[number];

export const db = new TrackerDB();

export function newId(): string {
  return crypto.randomUUID();
}
