import type { FontGrade } from '../grades/scale';
import type { Gym } from '../grades/gyms';

/** Local calendar date, `YYYY-MM-DD`. */
export type ISODate = string;
/** Local clock time, `HH:MM`. */
export type ClockTime = string;

export const ARCHETYPES = ['limit', 'intervals', 'circuits', 'hangboard', 'strength', 'run'] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export type Outcome = 'flash' | 'send' | 'project';

export interface Session {
  id: string;
  date: ISODate;
  archetype: Archetype;
  /** Epoch ms, drives the live timer. */
  startedAt: number;
  /** Minutes. Absent while the session is still open. */
  duration?: number;
  rpe?: number;
  gymId?: string;
  notes?: string;
}

export interface Problem {
  id: string;
  sessionId: string;
  gradeCanonical: FontGrade;
  gradeAsEntered: string;
  attempts: number;
  outcome: Outcome;
  /** Epoch ms, orders the list newest-first. */
  loggedAt: number;
}

export interface SetRow {
  id: string;
  sessionId: string;
  exercise: string;
  sets: number;
  reps: number;
  /** Added kg (negative = assisted). */
  load?: number;
  rir?: number;
  /** Per rep, e.g. a 10s hang. */
  durationSec?: number;
  distanceKm?: number;
}

/** kcal range. Never a point value. */
export interface KcalRange {
  low: number;
  high: number;
}

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type MealSize = 'small' | 'normal' | 'large';
export type EstimateSource = 'preset' | 'text' | 'photo' | 'manual';

export interface Meal {
  id: string;
  date: ISODate;
  slot: MealSlot;
  components: string[];
  size: MealSize;
  presetId?: string;
  estimate?: KcalRange;
  estimateSource: EstimateSource;
  photoRef?: string;
}

export interface MealPreset {
  id: string;
  name: string;
  estimate: KcalRange;
}

export interface Sleep {
  date: ISODate; // the morning you woke up
  bedtime: ClockTime;
  wake: ClockTime;
  quality?: 1 | 2 | 3;
}

export type Level = 'low' | 'ok' | 'high';
export interface CheckIn {
  date: ISODate;
  energy: Level;
  soreness: Level;
  motivation: Level;
  note?: string;
}

export const HABITS = ['stretch', 'read', 'guitar', 'mind'] as const;
export type Habit = (typeof HABITS)[number];
export interface HabitTick {
  date: ISODate;
  habit: Habit;
  done: boolean;
  durationSec?: number;
}

export interface TestResult {
  id: string;
  date: ISODate;
  testId: string;
  value: number;
  unit: string;
  conditions?: string;
}

export interface Equipment {
  id: string;
  name: string;
  attributes: Record<string, string>;
}

export type PrefRating = 'liked' | 'neutral' | 'disliked' | 'never';
export interface ExercisePref {
  exerciseId: string;
  rating: PrefRating;
}

export const BODY_AREAS = ['finger', 'wrist', 'elbow', 'shoulder', 'back', 'knee', 'other'] as const;
export type BodyArea = (typeof BODY_AREAS)[number];
export type NiggleStatus = 'watching' | 'hurting' | 'resolved';
export interface BodyNote {
  id: string;
  date: ISODate;
  kind: 'weakness' | 'niggle';
  area?: BodyArea;
  text: string;
  status?: NiggleStatus;
}

export interface Supplement {
  id: string;
  name: string;
  dose: string;
  /** Weekdays due, 0 = Mon. Empty = daily. */
  schedule: number[];
  startDate?: ISODate;
}

export interface SupplementTick {
  date: ISODate;
  supplementId: string;
  taken: boolean;
}

export interface PlanDay {
  /** 0 = Monday. */
  weekday: number;
  archetype: Archetype | 'rest';
  minutes?: number;
  note?: string;
}

export type GymProfile = Gym;

export interface Setting {
  key: string;
  value: unknown;
}
