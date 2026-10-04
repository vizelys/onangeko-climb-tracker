import { useLiveQuery } from 'dexie-react-hooks';
import type { GradeDisplay } from '../grades/scale';
import type { KcalRange } from './types';
import { db } from './db';

export interface Settings {
  gradeDisplay: GradeDisplay;
  showFineRow: boolean;
  lastGymId: string;
  demandRest: KcalRange;
  demandTraining: KcalRange;
  alarm: string;
  geminiKey: string;
  geminiModel: string;
}

export const DEFAULT_SETTINGS: Settings = {
  gradeDisplay: 'Font',
  showFineRow: true,
  lastGymId: 'arkose',
  demandRest: { low: 2200, high: 2500 },
  demandTraining: { low: 2600, high: 3000 },
  alarm: '06:45',
  geminiKey: '',
  geminiModel: 'gemini-flash-latest',
};

/** All settings, defaults filled in. Undefined only on the very first render. */
export function useSettings(): Settings {
  const rows = useLiveQuery(() => db.settings.toArray(), []);
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS };
  for (const r of rows ?? []) s[r.key] = r.value;
  return s as unknown as Settings;
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<unknown> {
  return db.settings.put({ key, value });
}
