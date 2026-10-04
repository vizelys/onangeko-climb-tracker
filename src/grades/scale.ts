/**
 * The canonical grade scale for the app is Font (Fontainebleau).
 * Everything entered — a gym colour, a Block'Out number, a V grade — is
 * resolved to one of these before it is stored.
 */
export const FONT_GRADES = [
  '3',
  '4',
  '4+',
  '5A',
  '5B',
  '5C',
  '6A',
  '6A+',
  '6B',
  '6B+',
  '6C',
  '6C+',
  '7A',
  '7A+',
  '7B',
  '7B+',
  '7C',
  '7C+',
  '8A',
  '8A+',
  '8B',
  '8B+',
  '8C',
  '8C+',
  '9A',
] as const;

export type FontGrade = (typeof FONT_GRADES)[number];

/**
 * V-scale equivalents, for display only. Never stored.
 *
 * The mapping is many-to-one in places (6A and 6A+ are both V3), which is
 * exactly why Font is canonical: converting to V and back loses information.
 *
 * 5C has no agreed V equivalent — conversion tables usually leave it blank
 * between V2 and V3. We show V2 rather than nothing, since a missing value in
 * a picker reads as a bug.
 */
const V_BY_FONT: Record<FontGrade, string> = {
  '3': 'VB',
  '4': 'VB',
  '4+': 'V0',
  '5A': 'V1',
  '5B': 'V2',
  '5C': 'V2',
  '6A': 'V3',
  '6A+': 'V3',
  '6B': 'V4',
  '6B+': 'V4',
  '6C': 'V5',
  '6C+': 'V6',
  '7A': 'V6',
  '7A+': 'V7',
  '7B': 'V8',
  '7B+': 'V8',
  '7C': 'V9',
  '7C+': 'V10',
  '8A': 'V11',
  '8A+': 'V12',
  '8B': 'V13',
  '8B+': 'V14',
  '8C': 'V15',
  '8C+': 'V16',
  '9A': 'V17',
};

const FONT_INDEX = new Map<string, number>(
  FONT_GRADES.map((g, i) => [g, i] as const),
);

export function isFontGrade(value: string): value is FontGrade {
  return FONT_INDEX.has(value);
}

/** Ordinal position on the canonical scale. Throws on an unknown grade. */
export function fontIndex(grade: FontGrade): number {
  const i = FONT_INDEX.get(grade);
  if (i === undefined) throw new Error(`Unknown Font grade: ${grade}`);
  return i;
}

export function fontAt(index: number): FontGrade {
  if (index < 0 || index >= FONT_GRADES.length) {
    throw new Error(`Font grade index out of range: ${index}`);
  }
  return FONT_GRADES[index];
}

export function toV(grade: FontGrade): string {
  return V_BY_FONT[grade];
}

/** Negative if a is easier than b, positive if harder, 0 if equal. */
export function compareGrades(a: FontGrade, b: FontGrade): number {
  return fontIndex(a) - fontIndex(b);
}

/** Step a grade by n positions, clamped to the ends of the scale. */
export function stepGrade(grade: FontGrade, n: number): FontGrade {
  const i = fontIndex(grade) + n;
  return fontAt(Math.min(Math.max(i, 0), FONT_GRADES.length - 1));
}

export type GradeDisplay = 'Font' | 'V';

export function formatGrade(grade: FontGrade, display: GradeDisplay): string {
  return display === 'Font' ? grade : toV(grade);
}

/** The scale the user is not currently showing, for the secondary readout. */
export function formatOther(grade: FontGrade, display: GradeDisplay): string {
  return display === 'Font' ? toV(grade) : grade;
}
