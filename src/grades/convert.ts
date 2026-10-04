import type { Band, Gym } from './gyms';
import {
  type FontGrade,
  type GradeDisplay,
  compareGrades,
  formatGrade,
  formatOther,
} from './scale';

/**
 * What gets written to a Problem row. `asEntered` is the tag the user actually
 * tapped, kept so a later correction to a gym profile can be audited rather
 * than silently rewriting history.
 */
export interface GradeEntry {
  canonical: FontGrade;
  asEntered: string;
  gymId: string;
}

/** Picker position: which band is selected, and which grade within it. */
export interface PickerState {
  gymId: string;
  bandIndex: number;
  fineIndex: number;
}

/**
 * The grade a band defaults to when selected: its middle, rounding down.
 * A 3-grade band defaults to the second, a 4-grade band to the second.
 * Matches `floor((n - 1) / 2)` from the design handoff.
 */
export function defaultFineIndex(band: Band): number {
  return Math.floor((band.grades.length - 1) / 2);
}

/** A band only needs the fine row when it covers more than one grade. */
export function bandNeedsFineRow(band: Band): boolean {
  return band.grades.length > 1;
}

export function bandAt(gym: Gym, bandIndex: number): Band {
  const band = gym.bands[bandIndex];
  if (!band) {
    throw new Error(`${gym.name} has no band at index ${bandIndex}`);
  }
  return band;
}

/** Open the picker on a gym: middle band, middle grade of that band. */
export function initialPickerState(gym: Gym): PickerState {
  const bandIndex = Math.floor((gym.bands.length - 1) / 2);
  return {
    gymId: gym.id,
    bandIndex,
    fineIndex: defaultFineIndex(bandAt(gym, bandIndex)),
  };
}

/** Selecting a band resets the fine selection to that band's middle. */
export function selectBand(gym: Gym, state: PickerState, bandIndex: number): PickerState {
  return {
    gymId: state.gymId,
    bandIndex,
    fineIndex: defaultFineIndex(bandAt(gym, bandIndex)),
  };
}

export function selectFine(gym: Gym, state: PickerState, fineIndex: number): PickerState {
  const band = bandAt(gym, state.bandIndex);
  if (fineIndex < 0 || fineIndex >= band.grades.length) {
    throw new Error(`${band.name} has no grade at index ${fineIndex}`);
  }
  return { ...state, fineIndex };
}

/** Resolve the current picker position to a canonical grade. */
export function resolve(gym: Gym, state: PickerState): GradeEntry {
  const band = bandAt(gym, state.bandIndex);
  const canonical = band.grades[state.fineIndex];
  if (!canonical) {
    throw new Error(`${band.name} has no grade at index ${state.fineIndex}`);
  }
  return { canonical, asEntered: band.name, gymId: gym.id };
}

/**
 * The reverse direction: given a Font grade, which band would this gym use?
 * Returns null when the gym does not set that grade at all, which is a real
 * case — a 3 at Vertical Art does not exist.
 */
export function bandForGrade(gym: Gym, grade: FontGrade): Band | null {
  return gym.bands.find((b) => b.grades.includes(grade)) ?? null;
}

/**
 * Place a grade in the picker, for editing a logged problem. Falls back to the
 * nearest band the gym does set, so the picker always opens somewhere sensible.
 */
export function stateForGrade(gym: Gym, grade: FontGrade): PickerState {
  for (let bandIndex = 0; bandIndex < gym.bands.length; bandIndex++) {
    const fineIndex = gym.bands[bandIndex].grades.indexOf(grade);
    if (fineIndex !== -1) return { gymId: gym.id, bandIndex, fineIndex };
  }

  // Not set here: fall back to the band whose nearest edge is closest.
  let best = 0;
  let bestDistance = Infinity;
  gym.bands.forEach((band, bandIndex) => {
    const distance = Math.min(
      ...band.grades.map((g) => Math.abs(compareGrades(g, grade))),
    );
    if (distance < bestDistance) {
      bestDistance = distance;
      best = bandIndex;
    }
  });
  return {
    gymId: gym.id,
    bandIndex: best,
    fineIndex: defaultFineIndex(bandAt(gym, best)),
  };
}

/** The picker's two readout lines. */
export function describe(
  gym: Gym,
  state: PickerState,
  display: GradeDisplay,
): { primary: string; secondary: string } {
  const band = bandAt(gym, state.bandIndex);
  const { canonical } = resolve(gym, state);
  return {
    primary: formatGrade(canonical, display),
    secondary: `${formatOther(canonical, display)} · ${band.name} @ ${gym.name}`,
  };
}

export const ATTEMPTS_MIN = 1;
export const ATTEMPTS_MAX = 99;

export function clampAttempts(n: number): number {
  if (!Number.isFinite(n)) return ATTEMPTS_MIN;
  return Math.min(Math.max(Math.round(n), ATTEMPTS_MIN), ATTEMPTS_MAX);
}
