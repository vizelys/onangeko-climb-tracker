import type { AppData } from '../db/useData';
import type { ISODate } from '../db/types';
import { highLoadThreshold, loadByDate, normBand, rollingTrace, type NormBand, type TracePoint } from './fingerLoad';
import { readiness, type Readiness } from './readiness';

export interface LoadView {
  trace: TracePoint[];
  norm: NormBand;
  readiness: Readiness;
}

/** The Load tab's numbers, recomputed from source rows on every read. */
export function loadView(data: AppData, today: ISODate): LoadView {
  const trace = rollingTrace(loadByDate(data.sessions, data.loads), today, 28);
  const norm = normBand(trace);
  return {
    trace,
    norm,
    readiness: readiness({
      today,
      trace,
      norm,
      sessions: data.sessions,
      loads: data.loads,
      highThreshold: highLoadThreshold(data.sessions, data.loads, today),
      checkIns: data.checkIns,
      bodyNotes: data.bodyNotes,
    }),
  };
}
