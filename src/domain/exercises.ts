import type { Equipment, ExercisePref, PrefRating } from '../db/types';

export interface Exercise {
  id: string;
  name: string;
  /** Equipment ids required. Empty = bodyweight, always available. */
  needs: string[];
}

export const EQUIPMENT_CATALOGUE: { id: string; name: string }[] = [
  { id: 'bar', name: 'Pull-up bar' },
  { id: 'hangboard', name: 'Hangboard' },
  { id: 'rings', name: 'Rings' },
  { id: 'kettlebell', name: 'Kettlebell' },
  { id: 'dumbbells', name: 'Dumbbells' },
  { id: 'barbell', name: 'Barbell + rack' },
  { id: 'bands', name: 'Resistance bands' },
  { id: 'weightvest', name: 'Weight belt / vest' },
];

export const EXERCISES: Exercise[] = [
  { id: 'pullup', name: 'Pull-up', needs: ['bar'] },
  { id: 'weighted-pullup', name: 'Weighted pull-up', needs: ['bar', 'weightvest'] },
  { id: 'lockoff', name: 'Lock-off', needs: ['bar'] },
  { id: 'front-lever', name: 'Front-lever progression', needs: ['bar'] },
  { id: 'ring-row', name: 'Ring row', needs: ['rings'] },
  { id: 'ring-dip', name: 'Ring dip', needs: ['rings'] },
  { id: 'pushup', name: 'Push-up', needs: [] },
  { id: 'pike-pushup', name: 'Pike push-up', needs: [] },
  { id: 'pistol', name: 'Pistol squat', needs: [] },
  { id: 'hollow', name: 'Hollow hold', needs: [] },
  { id: 'deadbug', name: 'Dead bug', needs: [] },
  { id: 'deadlift', name: 'Deadlift', needs: ['barbell'] },
  { id: 'squat', name: 'Back squat', needs: ['barbell'] },
  { id: 'ohp', name: 'Overhead press', needs: ['barbell'] },
  { id: 'db-press', name: 'Dumbbell press', needs: ['dumbbells'] },
  { id: 'db-row', name: 'One-arm row', needs: ['dumbbells'] },
  { id: 'reverse-wrist', name: 'Reverse wrist curl', needs: ['dumbbells'] },
  { id: 'kb-swing', name: 'Kettlebell swing', needs: ['kettlebell'] },
  { id: 'tgu', name: 'Turkish get-up', needs: ['kettlebell'] },
  { id: 'band-er', name: 'Band external rotation', needs: ['bands'] },
  { id: 'finger-ext', name: 'Finger extensor band', needs: ['bands'] },
];

const RANK: Record<PrefRating, number> = { liked: 0, neutral: 1, disliked: 2, never: 3 };

/** Derived, never stored: what you can do with what you own, liked first, `never` hidden. */
export function availableExercises(equipment: Equipment[], prefs: ExercisePref[]): Exercise[] {
  const owned = new Set(equipment.map((e) => e.id));
  const rating = new Map(prefs.map((p) => [p.exerciseId, p.rating]));
  return EXERCISES.filter((e) => e.needs.every((n) => owned.has(n)) && rating.get(e.id) !== 'never').sort(
    (a, b) => RANK[rating.get(a.id) ?? 'neutral'] - RANK[rating.get(b.id) ?? 'neutral'],
  );
}

export function exerciseName(id: string): string {
  return EXERCISES.find((e) => e.id === id)?.name ?? id;
}
