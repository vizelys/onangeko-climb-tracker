import { describe, expect, it } from 'vitest';
import { GYMS, getGym } from './gyms';
import {
  FONT_GRADES,
  compareGrades,
  fontIndex,
  isFontGrade,
  stepGrade,
  toV,
} from './scale';
import {
  bandForGrade,
  bandNeedsFineRow,
  clampAttempts,
  defaultFineIndex,
  describe as describeGrade,
  initialPickerState,
  resolve,
  selectBand,
  stateForGrade,
} from './convert';

describe('scale', () => {
  it('is strictly ordered', () => {
    for (let i = 1; i < FONT_GRADES.length; i++) {
      expect(compareGrades(FONT_GRADES[i - 1], FONT_GRADES[i])).toBeLessThan(0);
    }
  });

  it('rejects things that are not grades', () => {
    expect(isFontGrade('6A')).toBe(true);
    expect(isFontGrade('6A++')).toBe(false);
    expect(isFontGrade('V4')).toBe(false);
  });

  it('maps to V without gaps', () => {
    for (const g of FONT_GRADES) {
      expect(toV(g)).toMatch(/^V(B|\d+)$/);
    }
  });

  it('clamps at the ends when stepping', () => {
    expect(stepGrade('3', -5)).toBe('3');
    expect(stepGrade('9A', 5)).toBe('9A');
    expect(stepGrade('6B', 1)).toBe('6B+');
  });
});

describe('gym profiles', () => {
  it.each(GYMS)('$name is internally consistent', (gym) => {
    expect(gym.bands.length).toBeGreaterThan(0);

    const seen = new Set<string>();
    let previousIndex = -1;

    for (const band of gym.bands) {
      expect(band.grades.length).toBeGreaterThan(0);

      for (const grade of band.grades) {
        // No grade appears in two bands — the picker would be ambiguous.
        expect(seen.has(grade)).toBe(false);
        seen.add(grade);

        // Bands run easiest to hardest, and so do grades within a band.
        const index = fontIndex(grade);
        expect(index).toBeGreaterThan(previousIndex);
        previousIndex = index;
      }
    }
  });

  it('has exactly one provisional profile, flagged', () => {
    const provisional = GYMS.filter((g) => g.provisional);
    expect(provisional.map((g) => g.id)).toEqual(['the-roof']);
  });

  it("gives Block'Out one grade per tag except B3", () => {
    const blockout = getGym('blockout')!;
    const multi = blockout.bands.filter((b) => b.grades.length > 1);
    expect(multi.map((b) => b.name)).toEqual(['B3']);
  });
});

describe('picker', () => {
  const arkose = getGym('arkose')!;

  it('defaults a band to its middle grade', () => {
    // Rouge covers 6B, 6B+, 6C → middle is 6B+.
    const rouge = arkose.bands.find((b) => b.name === 'Rouge')!;
    expect(rouge.grades[defaultFineIndex(rouge)]).toBe('6B+');

    // Bleu covers 6A, 6A+ → floor((2-1)/2) = 0, the easier one.
    const bleu = arkose.bands.find((b) => b.name === 'Bleu')!;
    expect(bleu.grades[defaultFineIndex(bleu)]).toBe('6A');
  });

  it('only needs a fine row for multi-grade bands', () => {
    expect(bandNeedsFineRow(arkose.bands.find((b) => b.name === 'Blanc')!)).toBe(false);
    expect(bandNeedsFineRow(arkose.bands.find((b) => b.name === 'Rouge')!)).toBe(true);
  });

  it('resets the fine selection when the band changes', () => {
    let state = initialPickerState(arkose);
    const rougeIndex = arkose.bands.findIndex((b) => b.name === 'Rouge');

    state = selectBand(arkose, state, rougeIndex);
    expect(resolve(arkose, state).canonical).toBe('6B+');

    const violetIndex = arkose.bands.findIndex((b) => b.name === 'Violet');
    state = selectBand(arkose, state, violetIndex);
    // Violet covers 7B, 7B+, 7C, 7C+ → floor(3/2) = 1 → 7B+.
    expect(resolve(arkose, state).canonical).toBe('7B+');
  });

  it('keeps the tag as entered alongside the canonical grade', () => {
    const state = stateForGrade(arkose, '6C');
    const entry = resolve(arkose, state);
    expect(entry).toEqual({ canonical: '6C', asEntered: 'Rouge', gymId: 'arkose' });
  });

  it('round-trips every grade every gym sets', () => {
    for (const gym of GYMS) {
      for (const band of gym.bands) {
        for (const grade of band.grades) {
          expect(resolve(gym, stateForGrade(gym, grade)).canonical).toBe(grade);
        }
      }
    }
  });

  it('falls back to the nearest band for a grade the gym does not set', () => {
    const va = getGym('vertical-art')!;
    // Vertical Art starts at 4; a 3 has no band.
    expect(bandForGrade(va, '3')).toBeNull();
    const state = stateForGrade(va, '3');
    expect(va.bands[state.bandIndex].name).toBe('Orange');
  });

  it('reads out both scales', () => {
    const state = stateForGrade(arkose, '7A');
    expect(describeGrade(arkose, state, 'Font')).toEqual({
      primary: '7A',
      secondary: 'V6 · Noir @ Arkose',
    });
    expect(describeGrade(arkose, state, 'V')).toEqual({
      primary: 'V6',
      secondary: '7A · Noir @ Arkose',
    });
  });

  it('shows the same canonical grade across gyms with different tags', () => {
    const blockout = getGym('blockout')!;
    const a = resolve(arkose, stateForGrade(arkose, '6B+'));
    const b = resolve(blockout, stateForGrade(blockout, '6B+'));

    expect(a.canonical).toBe(b.canonical);
    expect(a.asEntered).toBe('Rouge');
    expect(b.asEntered).toBe('B7');
  });
});

describe('attempts', () => {
  it('clamps to 1..99 and rounds', () => {
    expect(clampAttempts(0)).toBe(1);
    expect(clampAttempts(-3)).toBe(1);
    expect(clampAttempts(100)).toBe(99);
    expect(clampAttempts(4.6)).toBe(5);
    expect(clampAttempts(Number.NaN)).toBe(1);
  });
});
