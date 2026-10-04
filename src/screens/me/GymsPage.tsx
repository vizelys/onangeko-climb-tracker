import { useState } from 'react';
import { db, newId } from '../../db/db';
import { GYMS, type Band, type Gym } from '../../grades/gyms';
import { FONT_GRADES, fontIndex, type FontGrade } from '../../grades/scale';
import ui from '../../ui/ui.module.css';

// Band colours are data, borrowed from the built-in profiles rather than hardcoded here.
const ARKOSE = GYMS[0];
const NEUTRAL = GYMS.find((x) => x.kind === 'number')?.bands[0].color ?? ARKOSE.bands[0].color;
import { Page } from './Page';

/**
 * Me › Gyms. Edits apply to future problems only — logged problems keep their
 * gradeCanonical, and gradeAsEntered is the audit trail (SPEC §6, §11).
 */
export function GymsPage({ gyms, onBack }: { gyms: Gym[]; onBack: () => void }) {
  const [editing, setEditing] = useState<Gym | null>(null);
  if (editing) return <GymEditor gym={editing} onDone={() => setEditing(null)} />;
  return (
    <Page title="Gyms" onBack={onBack}>
      <div className={ui.card} style={{ gap: 0 }}>
        {gyms.map((g) => (
          <button key={g.id} className={ui.listRow} onClick={() => setEditing(g)}>
            <span>
              {g.name}
              <span className={ui.caption}> {g.bands.length} {g.kind === 'number' ? 'numbers' : 'colours'}{g.provisional ? ' · provisional' : ''}</span>
            </span>
            <span style={{ color: 'var(--ink-3)' }}>›</span>
          </button>
        ))}
      </div>
      <button
        className={ui.btnOutline}
        onClick={() =>
          setEditing({ id: `gym-${newId().slice(0, 8)}`, name: 'New gym', kind: 'colour', bands: [structuredClone(ARKOSE.bands[2])] })
        }
      >
        + Add a gym
      </button>
    </Page>
  );
}

function range(from: FontGrade, to: FontGrade): FontGrade[] {
  const a = fontIndex(from);
  const b = fontIndex(to);
  return FONT_GRADES.slice(Math.min(a, b), Math.max(a, b) + 1) as FontGrade[];
}

function GymEditor({ gym, onDone }: { gym: Gym; onDone: () => void }) {
  const [g, setG] = useState<Gym>(structuredClone(gym));
  const builtIn = GYMS.some((x) => x.id === gym.id);
  const setBand = (i: number, patch: Partial<Band>) => setG({ ...g, bands: g.bands.map((b, k) => (k === i ? { ...b, ...patch } : b)) });

  return (
    <Page title={gym.name} onBack={onDone}>
      <div className={ui.card}>
        <input value={g.name} onChange={(e) => setG({ ...g, name: e.target.value })} />
        <input placeholder="note" value={g.note ?? ''} onChange={(e) => setG({ ...g, note: e.target.value || undefined })} />
        <div className={ui.seg}>
          {(['colour', 'number'] as const).map((k) => (
            <button key={k} className={`${ui.segBtn} ${g.kind === k ? ui.segOn : ''}`} onClick={() => setG({ ...g, kind: k })}>{k}</button>
          ))}
        </div>
        {g.provisional && (
          <button className={ui.btn} onClick={() => setG({ ...g, provisional: undefined })}>
            Mapping confirmed in the gym — drop “provisional”
          </button>
        )}
      </div>

      <span className={ui.label} style={{ padding: '0 4px' }}>Bands · easiest first</span>
      {g.bands.map((b, i) => (
        <div key={i} className={ui.card} style={{ gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: g.kind === 'colour' ? '1fr 56px 44px' : '1fr 44px', gap: 8 }}>
            <input value={b.name} onChange={(e) => setBand(i, { name: e.target.value })} />
            {g.kind === 'colour' && <input type="color" value={b.color} onChange={(e) => setBand(i, { color: e.target.value.toUpperCase() })} style={{ padding: 4 }} />}
            <button className={ui.btn} aria-label="Remove band" disabled={g.bands.length <= 1} onClick={() => setG({ ...g, bands: g.bands.filter((_, k) => k !== i) })}>×</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'center' }}>
            <select value={b.grades[0]} onChange={(e) => setBand(i, { grades: range(e.target.value as FontGrade, b.grades[b.grades.length - 1]) })}>
              {FONT_GRADES.map((f) => <option key={f}>{f}</option>)}
            </select>
            <span className={ui.caption}>to</span>
            <select value={b.grades[b.grades.length - 1]} onChange={(e) => setBand(i, { grades: range(b.grades[0], e.target.value as FontGrade) })}>
              {FONT_GRADES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>
      ))}
      <button
        className={ui.btnOutline}
        onClick={() => {
          const last = g.bands[g.bands.length - 1];
          const next = FONT_GRADES[Math.min(FONT_GRADES.length - 1, fontIndex(last.grades[last.grades.length - 1]) + 1)];
          setG({ ...g, bands: [...g.bands, { name: g.kind === 'number' ? `B${g.bands.length}` : 'Band', color: g.kind === 'number' ? NEUTRAL : ARKOSE.bands[0].color, grades: [next] }] });
        }}
      >
        + Add band
      </button>

      <button
        className={ui.btnPrimary}
        onClick={() => {
          void db.gymProfiles.put({ ...g, name: g.name.trim() || gym.name });
          onDone();
        }}
      >
        Save gym
      </button>
      {builtIn ? (
        <button className={ui.btnOutline} onClick={() => { void db.gymProfiles.delete(gym.id); onDone(); }}>Reset to built-in</button>
      ) : (
        <button className={ui.btnOutline} onClick={() => { void db.gymProfiles.delete(gym.id); onDone(); }}>Delete gym</button>
      )}
    </Page>
  );
}
