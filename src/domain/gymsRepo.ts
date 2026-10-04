import { GYMS, type Gym } from '../grades/gyms';
import type { GymProfile } from '../db/types';

/** Built-in gyms with user profiles layered on top by id, then user-only gyms. */
export function mergeGyms(profiles: GymProfile[]): Gym[] {
  const byId = new Map(profiles.map((p) => [p.id, p]));
  const merged = GYMS.map((g) => byId.get(g.id) ?? g);
  const extra = profiles.filter((p) => !GYMS.some((g) => g.id === p.id));
  return [...merged, ...extra];
}
