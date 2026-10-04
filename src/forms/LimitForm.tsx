import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/db';
import { discardSession, finishSession, logProblem, setSessionGym } from '../db/actions';
import { useSettings } from '../db/hooks';
import type { Outcome, Problem, Session } from '../db/types';
import { mergeGyms } from '../domain/gymsRepo';
import {
  ATTEMPTS_MAX,
  ATTEMPTS_MIN,
  bandNeedsFineRow,
  clampAttempts,
  describe,
  initialPickerState,
  resolve,
  selectBand,
  selectFine,
  type PickerState,
} from '../grades/convert';
import { GYMS, type Band, type Gym } from '../grades/gyms';
import { formatGrade, formatOther, isFontGrade } from '../grades/scale';
import { Sheet } from '../ui/Sheet';
import { Toast } from '../ui/Toast';
import { useToast } from '../ui/useToast';
import { isDark } from '../ui/color';
import ui from '../ui/ui.module.css';
import s from './LimitForm.module.css';

const OUTCOMES: { id: Outcome; label: string }[] = [
  { id: 'flash', label: 'Flash' },
  { id: 'send', label: 'Send' },
  { id: 'project', label: 'Project' },
];


function useClock(startedAt: number, running: boolean): number {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [running]);
  return Math.max(0, now - startedAt);
}

function formatClock(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const ss = String(sec % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

export function LimitForm({ session, onClose }: { session: Session; onClose: () => void }) {
  const settings = useSettings();
  const profiles = useLiveQuery(() => db.gymProfiles.toArray(), []);
  const gyms = useMemo(() => mergeGyms(profiles ?? []), [profiles]);
  const gym: Gym = gyms.find((g) => g.id === session.gymId) ?? gyms.find((g) => g.id === settings.lastGymId) ?? GYMS[0];

  const problems = useLiveQuery(
    () => db.problems.where('sessionId').equals(session.id).toArray(),
    [session.id],
  );
  const list = useMemo(() => [...(problems ?? [])].sort((a, b) => b.loggedAt - a.loggedAt), [problems]);

  const [picker, setPicker] = useState<PickerState>(() => initialPickerState(gym));
  const [attempts, setAttempts] = useState(1);
  const [toast, showToast] = useToast();
  const [sheet, setSheet] = useState<'gym' | 'end' | null>(null);
  const [editing, setEditing] = useState<Problem | null>(null);

  // Reset the picker if the gym changes under us (gym sheet, or profile edit).
  const state = picker.gymId === gym.id && picker.bandIndex < gym.bands.length ? picker : initialPickerState(gym);
  useEffect(() => {
    if (state !== picker) setPicker(state);
  }, [state, picker]);

  const live = session.duration === undefined;
  const elapsed = useClock(session.startedAt, live);
  const display = settings.gradeDisplay;
  const readout = describe(gym, state, display);
  const band = gym.bands[state.bandIndex];

  function commit(outcome: Outcome) {
    const entry = resolve(gym, state);
    void logProblem(session.id, entry, attempts, outcome);
    setAttempts(1);
    showToast(`✓ ${formatGrade(entry.canonical, display)} ${outcome} logged`);
  }

  return (
    <div className={s.form}>
      <header className={s.header}>
        <div className={s.headLeft}>
          <span className={s.headLabel}>
            LIMIT BOULDER · {list.length} {list.length === 1 ? 'PROBLEM' : 'PROBLEMS'}
          </span>
          <span className={`${ui.num} ${s.timer}`}>
            {live ? formatClock(elapsed) : `${session.duration} min`}
          </span>
        </div>
        <button className={s.gymChip} onClick={() => setSheet('gym')}>
          <span className={ui.dot} style={{ background: 'var(--mint)' }} />
          {gym.name}
        </button>
        <button className={s.end} onClick={() => setSheet('end')}>
          {live ? 'End' : 'Done'}
        </button>
      </header>

      <div className={s.list}>
        <Toast msg={toast} />
        {list.map((p) => (
          <ProblemRow key={p.id} p={p} gym={gyms.find((g) => g.id === p.gymId) ?? gym} display={display} onTap={() => setEditing(p)} />
        ))}
        {list.length === 0 && !toast && <div className={ui.empty}>Read the tag, tap the colour, tap the outcome.</div>}
      </div>

      <section className={s.picker}>
        <div className={s.readout}>
          <div className={s.readoutText}>
            <div className={s.grade}>{readout.primary}</div>
            <div className={s.secondary}>
              {readout.secondary}
              {gym.provisional ? ' · provisional' : ''}
            </div>
          </div>
          <div className={s.stepper}>
            <button className={s.stepBtn} aria-label="Fewer tries" disabled={attempts <= ATTEMPTS_MIN} onClick={() => setAttempts((a) => clampAttempts(a - 1))}>−</button>
            <div className={s.stepVal}>
              <span className={s.stepNum}>{attempts}</span>
              <span className={s.stepUnit}>TRIES</span>
            </div>
            <button className={s.stepBtn} aria-label="More tries" disabled={attempts >= ATTEMPTS_MAX} onClick={() => setAttempts((a) => clampAttempts(a + 1))}>+</button>
          </div>
        </div>

        {gym.kind === 'colour' ? (
          <div className={s.swatches}>
            {gym.bands.map((b, i) => (
              <button
                key={b.name}
                aria-label={b.name}
                className={`${s.swatch} ${i === state.bandIndex ? 'is-selected' : ''} ${isDark(b.color) ? 'swatch-black' : ''}`}
                style={{
                  background: b.color,
                  boxShadow: i === state.bandIndex && isDark(b.color)
                    ? 'inset 0 0 0 1.5px var(--edge-black), 0 0 0 2px var(--surface-1), 0 0 0 4px var(--ink)'
                    : undefined,
                }}
                onClick={() => setPicker(selectBand(gym, state, i))}
              />
            ))}
          </div>
        ) : (
          <div className={s.numbers}>
            {gym.bands.map((b, i) => (
              <button key={b.name} className={`${s.numCell} ${i === state.bandIndex ? s.numOn : ''}`} onClick={() => setPicker(selectBand(gym, state, i))}>
                {b.name}
              </button>
            ))}
          </div>
        )}

        {settings.showFineRow && bandNeedsFineRow(band) && (
          <div className={s.fine}>
            {band.grades.map((g, i) => (
              <button key={g} className={`${s.fineCell} ${i === state.fineIndex ? s.fineOn : ''}`} onClick={() => setPicker(selectFine(gym, state, i))}>
                {g}
              </button>
            ))}
          </div>
        )}

        <div className={s.outcomes}>
          {OUTCOMES.map((o) => (
            <button key={o.id} className={`${s.outcome} ${s[o.id]}`} onClick={() => commit(o.id)}>
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {sheet === 'gym' && (
        <GymSheet
          gyms={gyms}
          current={gym.id}
          onPick={(g) => {
            void setSessionGym(session.id, g.id);
            setPicker(initialPickerState(g));
            setSheet(null);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet === 'end' && (
        <EndSheet
          session={session}
          elapsedMin={live ? elapsed / 60000 : (session.duration ?? 0)}
          count={list.length}
          onKeep={() => setSheet(null)}
          onDone={onClose}
        />
      )}
      {editing && <ProblemSheet p={editing} display={display} onClose={() => setEditing(null)} />}
    </div>
  );
}

function bandFor(gym: Gym, p: Problem): Band | undefined {
  return gym.bands.find((b) => b.name === p.gradeAsEntered);
}

function ProblemRow({ p, gym, display, onTap }: { p: Problem; gym: Gym; display: 'Font' | 'V'; onTap: () => void }) {
  const band = bandFor(gym, p);
  const numbered = gym.kind === 'number';
  return (
    <button className={s.row} onClick={onTap}>
      <span
        className={`${s.rowSwatch} ${band && isDark(band.color) ? 'swatch-black' : ''}`}
        style={{ background: numbered ? 'var(--line)' : (band?.color ?? 'var(--line)') }}
      >
        {numbered ? p.gradeAsEntered : ''}
      </span>
      <span className={s.rowGrade}>{formatGrade(p.gradeCanonical, display)}</span>
      <span className={s.rowMeta}>
        {p.gradeAsEntered} · {formatOther(p.gradeCanonical, display)} · ×{p.attempts}
      </span>
      <span className={`${s.pill} ${s['pill_' + p.outcome]}`}>{p.outcome[0].toUpperCase() + p.outcome.slice(1)}</span>
    </button>
  );
}

export function GymSheet({ gyms, current, onPick, onClose }: { gyms: Gym[]; current: string; onPick: (g: Gym) => void; onClose: () => void }) {
  return (
    <Sheet onClose={onClose} label="Where are you climbing today?">
      {gyms.map((g) => (
        <button key={g.id} className={s.gymRow} onClick={() => onPick(g)}>
          <span className={s.gymText}>
            <span className={s.gymName}>{g.name}</span>
            <span className={ui.caption}>
              {g.note ?? (g.kind === 'number' ? 'Numbered' : 'Colours')}
              {g.provisional ? ' · provisional' : ''}
            </span>
            <span className={s.strip}>
              {g.bands.map((b) => (
                <span key={b.name} style={{ background: g.kind === 'number' ? 'var(--line-strong)' : b.color }} />
              ))}
            </span>
          </span>
          {g.id === current && <span className={s.check}>✓</span>}
        </button>
      ))}
      <div className={ui.caption}>+ Add a gym in Me › Gyms — map its colours once</div>
    </Sheet>
  );
}

const DEFAULT_RPE = 7;

function EndSheet({ session, elapsedMin, count, onKeep, onDone }: {
  session: Session;
  elapsedMin: number;
  count: number;
  onKeep: () => void;
  onDone: () => void;
}) {
  const [minutes, setMinutes] = useState(Math.max(1, Math.round(elapsedMin)));
  const live = session.duration === undefined;
  const save = (rpe: number) => {
    void finishSession(session.id, minutes, rpe);
    onDone();
  };

  if (live && count === 0) {
    return (
      <Sheet onClose={onKeep} label="Nothing logged yet">
        <button className={ui.btnPrimary} onClick={() => { void discardSession(session.id); onDone(); }}>Discard session</button>
        <button className={ui.btnOutline} onClick={onKeep}>Keep climbing</button>
      </Sheet>
    );
  }
  return (
    <Sheet onClose={() => (live ? save(session.rpe ?? DEFAULT_RPE) : onDone())} label="How hard was that? · RPE">
      <div className={ui.spread}>
        <span className={ui.body2}>Duration</span>
        <div className={s.stepper}>
          <button className={s.stepBtn} onClick={() => setMinutes((m) => Math.max(1, m - 5))}>−</button>
          <div className={s.stepVal}>
            <span className={s.stepNum}>{minutes}</span>
            <span className={s.stepUnit}>MIN</span>
          </div>
          <button className={s.stepBtn} onClick={() => setMinutes((m) => m + 5)}>+</button>
        </div>
      </div>
      <div className={s.rpeRow}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} className={`${s.rpeCell} ${session.rpe === n ? s.fineOn : ''}`} onClick={() => save(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className={ui.caption}>Tap a number to save. Swiping away saves RPE {session.rpe ?? DEFAULT_RPE}.</div>
      {live && <button className={ui.btnOutline} onClick={onKeep}>Keep climbing</button>}
    </Sheet>
  );
}

function ProblemSheet({ p, display, onClose }: { p: Problem; display: 'Font' | 'V'; onClose: () => void }) {
  const [attempts, setAttempts] = useState(p.attempts);
  const save = (patch: Partial<Problem>) => {
    void db.problems.update(p.id, { attempts, ...patch });
    onClose();
  };
  const grade = isFontGrade(p.gradeCanonical) ? formatGrade(p.gradeCanonical, display) : p.gradeCanonical;
  return (
    <Sheet onClose={() => save({})} label={`Edit · ${grade} · ${p.gradeAsEntered}`}>
      <div className={ui.spread}>
        <span className={ui.body2}>Tries</span>
        <div className={s.stepper}>
          <button className={s.stepBtn} onClick={() => setAttempts((a) => clampAttempts(a - 1))}>−</button>
          <div className={s.stepVal}><span className={s.stepNum}>{attempts}</span><span className={s.stepUnit}>TRIES</span></div>
          <button className={s.stepBtn} onClick={() => setAttempts((a) => clampAttempts(a + 1))}>+</button>
        </div>
      </div>
      <div className={s.outcomes}>
        {OUTCOMES.map((o) => (
          <button key={o.id} className={`${s.outcome} ${s[o.id]} ${p.outcome === o.id ? 'is-selected' : ''}`} onClick={() => save({ outcome: o.id })}>
            {o.label}
          </button>
        ))}
      </div>
      <button className={ui.btnOutline} onClick={() => { void db.problems.delete(p.id); onClose(); }}>Delete problem</button>
    </Sheet>
  );
}

