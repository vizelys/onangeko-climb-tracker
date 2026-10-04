import type { Archetype } from '../db/types';

export type FingerClass = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'VERY HIGH';

export interface ArchetypeInfo {
  id: Archetype;
  name: string;
  /** CSS custom property name, never a hex. */
  accent: string;
  hint: string;
  /** Finger-load meter segments, 0–4. */
  meter: number;
  fingerClass: FingerClass;
  /** Finger-load archetype weight, SPEC §5. */
  weight: number;
}

export const ARCHETYPE_INFO: Record<Archetype, ArchetypeInfo> = {
  limit: { id: 'limit', name: 'Limit boulder', accent: '--strawberry', hint: 'Grade · tries · outcome', meter: 3, fingerClass: 'HIGH', weight: 0.8 },
  intervals: { id: 'intervals', name: 'Intervals', accent: '--aqua', hint: 'Rounds × moves', meter: 2, fingerClass: 'MODERATE', weight: 0.5 },
  circuits: { id: 'circuits', name: 'Circuits', accent: '--mint', hint: 'Minutes · RPE', meter: 1, fingerClass: 'LOW', weight: 0.25 },
  hangboard: { id: 'hangboard', name: 'Hangboard', accent: '--purple', hint: 'Edge · hang · added kg', meter: 4, fingerClass: 'VERY HIGH', weight: 1.0 },
  strength: { id: 'strength', name: 'Strength', accent: '--petal', hint: 'Sets × reps × kg', meter: 0, fingerClass: 'NONE', weight: 0 },
  run: { id: 'run', name: 'Run', accent: '--petal', hint: 'Minutes · km', meter: 0, fingerClass: 'NONE', weight: 0 },
};

export const ARCHETYPE_ORDER: Archetype[] = ['limit', 'intervals', 'circuits', 'hangboard', 'strength', 'run'];
