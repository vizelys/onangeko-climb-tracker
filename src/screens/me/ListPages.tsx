import { useState } from 'react';
import { db, newId } from '../../db/db';
import type { MealPreset, Supplement } from '../../db/types';
import { formatKcalRange } from '../../domain/summaries';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

const WD = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function SupplementsPage({ items, onBack }: { items: Supplement[]; onBack: () => void }) {
  const [name, setName] = useState('');
  const [dose, setDose] = useState('');
  return (
    <Page title="Supplements" onBack={onBack}>
      <div className={ui.card}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input placeholder="Creatine" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="5 g" value={dose} onChange={(e) => setDose(e.target.value)} />
        </div>
        <button
          className={ui.btnPrimary}
          disabled={!name.trim()}
          onClick={() => {
            void db.supplements.add({ id: newId(), name: name.trim(), dose: dose.trim(), schedule: [] });
            setName('');
            setDose('');
          }}
        >
          Add
        </button>
      </div>
      {items.map((sp) => (
        <div key={sp.id} className={ui.card} style={{ gap: 8 }}>
          <div className={ui.spread}>
            <span style={{ fontWeight: 600 }}>{sp.name}</span>
            <span className={ui.caption}>{sp.dose} · {sp.schedule.length === 0 ? 'daily' : `${sp.schedule.length}×/wk`}</span>
          </div>
          <div className={ui.seg}>
            {WD.map((d, i) => (
              <button
                key={i}
                className={`${ui.segBtn} ${sp.schedule.length === 0 || sp.schedule.includes(i) ? ui.segOn : ''}`}
                onClick={() => {
                  const base = sp.schedule.length === 0 ? [0, 1, 2, 3, 4, 5, 6] : sp.schedule;
                  const next = base.includes(i) ? base.filter((x) => x !== i) : [...base, i].sort();
                  void db.supplements.update(sp.id, { schedule: next.length === 7 ? [] : next });
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <button className={ui.caption} style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={() => void db.supplements.delete(sp.id)}>Delete</button>
        </div>
      ))}
    </Page>
  );
}

export function PresetsPage({ items, onBack }: { items: MealPreset[]; onBack: () => void }) {
  const [name, setName] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const ok = name.trim() && Number(low) > 0 && Number(high) >= Number(low);
  return (
    <Page title="Food presets" onBack={onBack}>
      <div className={ui.body2} style={{ padding: '0 4px' }}>Plates you eat often, each a kcal range.</div>
      <div className={ui.card}>
        <input placeholder="Porridge + banana" value={name} onChange={(e) => setName(e.target.value)} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input inputMode="numeric" placeholder="low kcal" value={low} onChange={(e) => setLow(e.target.value)} />
          <input inputMode="numeric" placeholder="high kcal" value={high} onChange={(e) => setHigh(e.target.value)} />
        </div>
        <button
          className={ui.btnPrimary}
          disabled={!ok}
          onClick={() => {
            void db.mealPresets.add({ id: newId(), name: name.trim(), estimate: { low: Number(low), high: Number(high) } });
            setName('');
            setLow('');
            setHigh('');
          }}
        >
          Add
        </button>
      </div>
      <div className={ui.card} style={{ gap: 0 }}>
        {items.length === 0 && <div className={ui.empty}>No presets yet.</div>}
        {items.map((p) => (
          <div key={p.id} className={ui.listRow}>
            <span>{p.name} <span className={ui.caption}>{formatKcalRange(p.estimate)}</span></span>
            <button className={ui.caption} style={{ minHeight: 44 }} onClick={() => void db.mealPresets.delete(p.id)}>Delete</button>
          </div>
        ))}
      </div>
    </Page>
  );
}
