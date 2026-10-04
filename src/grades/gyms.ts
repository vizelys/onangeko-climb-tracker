import type { FontGrade } from './scale';

export interface Band {
  /** The tag as it appears in the gym — "Rouge", "B7". */
  name: string;
  /** Swatch colour. Display only; never used for logic. */
  color: string;
  /** Font grades this band covers, easiest first. Never empty. */
  grades: FontGrade[];
}

export interface Gym {
  id: string;
  name: string;
  /** `colour` shows swatches, `number` shows a grid of numbered cells. */
  kind: 'colour' | 'number';
  /** Short note shown in the gym sheet. */
  note?: string;
  /** True when the mapping is a guess and needs confirming in the gym. */
  provisional?: boolean;
  /** Easiest band first. The picker renders them in this order. */
  bands: Band[];
}

// Swatch colours. `edge-black` is applied as an inset ring on the black
// swatch so it reads against the near-black background.
const C = {
  blanc: '#F3ECE8',
  jaune: '#FBD87F',
  orange: '#FFB27A',
  vert: '#10FFCB',
  bleu: '#B5F8FE',
  rouge: '#F75590',
  noir: '#0A0909',
  violet: '#C9A2FF',
  neutral: '#2A2627',
} as const;

export const GYMS: Gym[] = [
  {
    id: 'arkose',
    name: 'Arkose',
    kind: 'colour',
    note: 'Also M Roc',
    bands: [
      { name: 'Blanc', color: C.blanc, grades: ['3'] },
      { name: 'Jaune', color: C.jaune, grades: ['4', '4+'] },
      { name: 'Vert', color: C.vert, grades: ['5A', '5B', '5C'] },
      { name: 'Bleu', color: C.bleu, grades: ['6A', '6A+'] },
      { name: 'Rouge', color: C.rouge, grades: ['6B', '6B+', '6C'] },
      { name: 'Noir', color: C.noir, grades: ['6C+', '7A', '7A+'] },
      { name: 'Violet', color: C.violet, grades: ['7B', '7B+', '7C', '7C+'] },
    ],
  },
  {
    id: 'vertical-art',
    name: 'Vertical Art',
    kind: 'colour',
    note: 'Also Hardbloc',
    bands: [
      { name: 'Orange', color: C.orange, grades: ['4', '4+'] },
      { name: 'Vert', color: C.vert, grades: ['5A', '5B', '5C'] },
      { name: 'Bleu', color: C.bleu, grades: ['6A', '6A+', '6B'] },
      { name: 'Rouge', color: C.rouge, grades: ['6B+', '6C', '6C+'] },
      { name: 'Noir', color: C.noir, grades: ['7A', '7A+', '7B'] },
      { name: 'Violet', color: C.violet, grades: ['7B+', '7C', '7C+'] },
    ],
  },
  {
    id: 'blockout',
    name: "Block'Out",
    kind: 'number',
    note: 'Numbered B-scale',
    bands: [
      { name: 'B0', color: C.neutral, grades: ['4'] },
      { name: 'B1', color: C.neutral, grades: ['4+'] },
      { name: 'B2', color: C.neutral, grades: ['5A'] },
      { name: 'B3', color: C.neutral, grades: ['5B', '5C'] },
      { name: 'B4', color: C.neutral, grades: ['6A'] },
      { name: 'B5', color: C.neutral, grades: ['6A+'] },
      { name: 'B6', color: C.neutral, grades: ['6B'] },
      { name: 'B7', color: C.neutral, grades: ['6B+'] },
      { name: 'B8', color: C.neutral, grades: ['6C'] },
      { name: 'B9', color: C.neutral, grades: ['6C+'] },
      { name: 'B10', color: C.neutral, grades: ['7A'] },
      { name: 'B11', color: C.neutral, grades: ['7A+'] },
      { name: 'B12', color: C.neutral, grades: ['7B'] },
      { name: 'B13', color: C.neutral, grades: ['7B+'] },
      { name: 'B14', color: C.neutral, grades: ['7C'] },
      { name: 'B15', color: C.neutral, grades: ['7C+'] },
    ],
  },
  {
    id: 'the-roof',
    name: 'The Roof',
    kind: 'colour',
    note: 'Grade is the start sticker, not the hold colour',
    provisional: true,
    bands: [
      { name: 'Jaune', color: C.jaune, grades: ['4', '4+', '5A'] },
      { name: 'Vert', color: C.vert, grades: ['5B', '5C', '6A'] },
      { name: 'Bleu', color: C.bleu, grades: ['6A+', '6B', '6B+'] },
      { name: 'Rouge', color: C.rouge, grades: ['6C', '6C+', '7A'] },
      { name: 'Noir', color: C.noir, grades: ['7A+', '7B', '7B+'] },
      { name: 'Violet', color: C.violet, grades: ['7C', '7C+', '8A'] },
    ],
  },
];

export function getGym(id: string): Gym | undefined {
  return GYMS.find((g) => g.id === id);
}
