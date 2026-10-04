import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { db, newId } from '../db/db';
import { discardSession, saveSession } from '../db/actions';
import type { Archetype, Session, SetRow } from '../db/types';
import { ARCHETYPE_INFO } from '../domain/archetypes';
import { todayISO } from '../domain/dates';
import { availableExercises, exerciseName } from '../domain/exercises';
import { useToast } from '../ui/useToast';
import { Toast } from '../ui/Toast';
import ui from '../ui/ui.module.css';
import s from './SessionForm.module.css';

type Row = Omit<SetRow, 'id' | 'sessionId'>;

const DEFAULT_ROWS: Partial<Record<Archetype, Row[]>> = {
  intervals: [{ exercise: 'intervals', sets: 5, reps: 8 }],
  hangboard: [{ exercise: '20mm', sets: 6, reps: 1, durationSec: 10, load: 0 }],
  strength: [],
  run: [{ exercise: 'run', sets: 1, reps: 1, distanceKm: 5 }],
};
const DEFAULT_MIN: Record<Archetype, number> = { limit: 75, intervals: 45, circuits: 40, hangboard: 30, strength: 45, run: 35 };

function num(v: string): number {
  const n = parseFloat(v.replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Every field defaulted; Save is never blocked (SPEC §2.2). */
export function SessionForm({ archetype, existing, onClose }: { archetype: Archetype; existing?: Session; onClose: () => void }) {
  const info = ARCHETYPE_INFO[archetype];
  const existingRows = useLiveQuery(
    async (): Promise<SetRow[]> => (existing ? db.setRows.where('sessionId').equals(existing.id).toArray() : []),
    [existing?.id],
  );
  const equipment = useLiveQuery(() => db.equipment.toArray(), []);
  const prefs = useLiveQuery(() => db.exercisePrefs.toArray(), []);
  const exercises = useMemo(() => availableExercises(equipment ?? [], prefs ?? []), [equipment, prefs]);

  const [date, setDate] = useState(existing?.date ?? todayISO());
  const [minutes, setMinutes] = useState(String(existing?.duration ?? DEFAULT_MIN[archetype]));
  const [rpe, setRpe] = useState(existing?.rpe ?? 7);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [rows, setRows] = useState<Row[] | null>(existing ? null : (DEFAULT_ROWS[archetype] ?? []));
  const [toast, showToast] = useToast();

  // On edit, rows load asynchronously once.
  const shown: Row[] = rows ?? existingRows?.map(({ id: _id, sessionId: _s, ...r }) => r) ?? [];
  const setRow = (i: number, patch: Partial<Row>) => setRows(shown.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  function save() {
    const session: Session = {
      id: existing?.id ?? newId(),
      date,
      archetype,
      startedAt: existing?.startedAt ?? Date.now(),
      duration: Math.max(1, Math.round(num(minutes))),
      rpe,
      notes: notes.trim() || undefined,
      gymId: existing?.gymId,
    };
    void saveSession(session, shown);
    showToast(`✓ ${info.name.toLowerCase()} logged`);
    window.setTimeout(onClose, 600);
  }

  return (
    <div className={s.form}>
      <header className={s.header}>
        <div className={s.headLeft}>
          <span className={s.headLabel} style={{ color: `var(${info.accent})` }}>
            {info.name.toUpperCase()} · FINGER {info.fingerClass}
          </span>
          <span className={ui.title}>{existing ? 'Edit session' : info.name}</span>
        </div>
        <button className={ui.btnOutline} onClick={onClose}>Close</button>
      </header>

      <div className={s.body}>
        <div className={s.grid2}>
          <label className={ui.field}>
            <span className={ui.label}>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} />
          </label>
          <label className={ui.field}>
            <span className={ui.label}>Minutes</span>
            <input inputMode="numeric" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
        </div>

        {archetype === 'intervals' && shown[0] && (
          <div className={s.grid2}>
            <label className={ui.field}><span className={ui.label}>Rounds</span><input inputMode="numeric" value={shown[0].sets} onChange={(e) => setRow(0, { sets: num(e.target.value) })} /></label>
            <label className={ui.field}><span className={ui.label}>Moves</span><input inputMode="numeric" value={shown[0].reps} onChange={(e) => setRow(0, { reps: num(e.target.value) })} /></label>
          </div>
        )}

        {archetype === 'run' && shown[0] && (
          <label className={ui.field}><span className={ui.label}>Distance · km</span><input inputMode="decimal" value={shown[0].distanceKm ?? 0} onChange={(e) => setRow(0, { distanceKm: num(e.target.value) })} /></label>
        )}

        {archetype === 'hangboard' && (
          <div className={s.rows}>
            <div className={s.rowHead}><span>Edge</span><span>Sets</span><span>Reps</span><span>Sec</span><span>+kg</span><span /></div>
            {shown.map((r, i) => (
              <div key={i} className={s.rowHang}>
                <input value={r.exercise} onChange={(e) => setRow(i, { exercise: e.target.value })} />
                <input inputMode="numeric" value={r.sets} onChange={(e) => setRow(i, { sets: num(e.target.value) })} />
                <input inputMode="numeric" value={r.reps} onChange={(e) => setRow(i, { reps: num(e.target.value) })} />
                <input inputMode="numeric" value={r.durationSec ?? 0} onChange={(e) => setRow(i, { durationSec: num(e.target.value) })} />
                <input inputMode="decimal" value={r.load ?? 0} onChange={(e) => setRow(i, { load: num(e.target.value) })} />
                <button className={s.x} aria-label="Remove" onClick={() => setRows(shown.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <button className={ui.btn} onClick={() => setRows([...shown, { ...(shown[shown.length - 1] ?? { exercise: '20mm', sets: 6, reps: 1, durationSec: 10, load: 0 }) }])}>+ Add grip</button>
          </div>
        )}

        {archetype === 'strength' && (
          <div className={s.rows}>
            {shown.length > 0 && <div className={s.rowHeadStr}><span>Exercise</span><span>Sets</span><span>Reps</span><span>kg</span><span>RIR</span><span /></div>}
            {shown.map((r, i) => (
              <div key={i} className={s.rowStr}>
                <span className={s.exName}>{exerciseName(r.exercise)}</span>
                <input inputMode="numeric" value={r.sets} onChange={(e) => setRow(i, { sets: num(e.target.value) })} />
                <input inputMode="numeric" value={r.reps} onChange={(e) => setRow(i, { reps: num(e.target.value) })} />
                <input inputMode="decimal" value={r.load ?? 0} onChange={(e) => setRow(i, { load: num(e.target.value) })} />
                <input inputMode="numeric" value={r.rir ?? 2} onChange={(e) => setRow(i, { rir: num(e.target.value) })} />
                <button className={s.x} aria-label="Remove" onClick={() => setRows(shown.filter((_, k) => k !== i))}>×</button>
              </div>
            ))}
            <div className={s.chips}>
              {exercises.map((e) => (
                <button key={e.id} className={ui.chip} onClick={() => setRows([...shown, { exercise: e.id, sets: 3, reps: 5, load: 0, rir: 2 }])}>
                  + {e.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={ui.field}>
          <span className={ui.label}>RPE</span>
          <div className={s.rpe}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={`${ui.segBtn} ${rpe === n ? ui.segOn : ''}`} onClick={() => setRpe(n)}>{n}</button>
            ))}
          </div>
        </div>

        <label className={ui.field}>
          <span className={ui.label}>Notes</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>

        {existing && (
          <button className={ui.btnOutline} onClick={() => { void discardSession(existing.id); onClose(); }}>Delete session</button>
        )}
      </div>

      <footer className={s.footer}>
        <Toast msg={toast} />
        <button className={ui.btnPrimary} style={{ background: `var(${info.accent})` }} onClick={save}>
          {existing ? 'Save changes' : 'Save session'}
        </button>
      </footer>
    </div>
  );
}
