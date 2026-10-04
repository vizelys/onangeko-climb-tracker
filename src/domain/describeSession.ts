import type { Problem, Session, SetRow } from '../db/types';
import { fontIndex } from '../grades/scale';
import { ARCHETYPE_INFO } from './archetypes';

/** One-line summary, e.g. "5 × 8 moves" or "6 problems · top 7A". */
export function sessionSummary(s: Session, problems: Problem[], rows: SetRow[]): string {
  const mine = rows.filter((r) => r.sessionId === s.id);
  switch (s.archetype) {
    case 'limit': {
      const ps = problems.filter((p) => p.sessionId === s.id);
      const sends = ps.filter((p) => p.outcome !== 'project');
      if (ps.length === 0) return `${s.duration ?? 0} min`;
      const top = sends.sort((a, b) => fontIndex(b.gradeCanonical) - fontIndex(a.gradeCanonical))[0];
      return `${ps.length} problems${top ? ` · top ${top.gradeCanonical}` : ''}`;
    }
    case 'intervals':
      return mine[0] ? `${mine[0].sets} × ${mine[0].reps} moves` : `${s.duration} min`;
    case 'hangboard': {
      const sec = mine.reduce((a, r) => a + r.sets * r.reps * (r.durationSec ?? 0), 0);
      return `${sec}s hanging · ${mine.length} grip${mine.length === 1 ? '' : 's'}`;
    }
    case 'strength':
      return `${mine.length} exercise${mine.length === 1 ? '' : 's'} · ${s.duration} min`;
    case 'run':
      return mine[0]?.distanceKm ? `${mine[0].distanceKm} km · ${s.duration} min` : `${s.duration} min`;
    default:
      return `${s.duration} min · RPE ${s.rpe ?? '–'}`;
  }
}

export function archetypeName(s: Session): string {
  return ARCHETYPE_INFO[s.archetype].name;
}
