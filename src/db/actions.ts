import type { FontGrade } from '../grades/scale';
import { todayISO } from '../domain/dates';
import { db, newId } from './db';
import type { Archetype, Outcome, Session, SetRow } from './types';

/**
 * Every write goes straight to IndexedDB. Callers fire and forget — live
 * queries re-render, so there is never a spinner on save.
 */

export async function startLiveSession(archetype: Archetype, gymId: string): Promise<string> {
  const id = newId();
  await db.sessions.add({ id, date: todayISO(), archetype, startedAt: Date.now(), gymId });
  return id;
}

export function setSessionGym(sessionId: string, gymId: string) {
  return Promise.all([db.sessions.update(sessionId, { gymId }), db.settings.put({ key: 'lastGymId', value: gymId })]);
}

export function finishSession(sessionId: string, duration: number, rpe: number) {
  return db.sessions.update(sessionId, { duration: Math.max(1, Math.round(duration)), rpe });
}

export async function discardSession(sessionId: string) {
  await db.transaction('rw', db.sessions, db.problems, db.setRows, async () => {
    await db.problems.where('sessionId').equals(sessionId).delete();
    await db.setRows.where('sessionId').equals(sessionId).delete();
    await db.sessions.delete(sessionId);
  });
}

export function logProblem(
  sessionId: string,
  entry: { canonical: FontGrade; asEntered: string; gymId: string },
  attempts: number,
  outcome: Outcome,
) {
  return db.problems.add({
    id: newId(),
    sessionId,
    gradeCanonical: entry.canonical,
    gradeAsEntered: entry.asEntered,
    gymId: entry.gymId,
    attempts,
    outcome,
    loggedAt: Date.now(),
  });
}

/** Save a non-live session (intervals, hangboard, …) with its rows, replacing old rows on edit. */
export async function saveSession(session: Session, rows: Omit<SetRow, 'id' | 'sessionId'>[]) {
  await db.transaction('rw', db.sessions, db.setRows, async () => {
    await db.sessions.put(session);
    await db.setRows.where('sessionId').equals(session.id).delete();
    await db.setRows.bulkAdd(rows.map((r) => ({ ...r, id: newId(), sessionId: session.id })));
  });
}
