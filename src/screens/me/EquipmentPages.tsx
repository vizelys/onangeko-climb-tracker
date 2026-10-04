import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/db';
import type { PrefRating } from '../../db/types';
import { EQUIPMENT_CATALOGUE, EXERCISES } from '../../domain/exercises';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

export function EquipmentPage({ onBack }: { onBack: () => void }) {
  const owned = useLiveQuery(() => db.equipment.toArray(), []) ?? [];
  const has = new Set(owned.map((e) => e.id));
  return (
    <Page title="Equipment" onBack={onBack}>
      <div className={ui.card} style={{ gap: 0 }}>
        {EQUIPMENT_CATALOGUE.map((e) => (
          <button
            key={e.id}
            className={ui.listRow}
            onClick={() => (has.has(e.id) ? void db.equipment.delete(e.id) : void db.equipment.put({ id: e.id, name: e.name, attributes: {} }))}
          >
            <span>{e.name}</span>
            <span style={{ color: has.has(e.id) ? 'var(--mint)' : 'var(--ink-3)', fontWeight: 700 }}>{has.has(e.id) ? '✓' : '—'}</span>
          </button>
        ))}
      </div>
    </Page>
  );
}

const RATINGS: PrefRating[] = ['liked', 'neutral', 'disliked', 'never'];

export function PrefsPage({ onBack }: { onBack: () => void }) {
  const prefs = useLiveQuery(() => db.exercisePrefs.toArray(), []) ?? [];
  const owned = new Set((useLiveQuery(() => db.equipment.toArray(), []) ?? []).map((e) => e.id));
  const rating = new Map(prefs.map((p) => [p.exerciseId, p.rating]));
  const list = EXERCISES.filter((e) => e.needs.every((n) => owned.has(n)));
  return (
    <Page title="Exercise preferences" onBack={onBack}>
      <div className={ui.body2} style={{ padding: '0 4px' }}>Only exercises your equipment allows. “Never” hides it from Strength.</div>
      {list.map((e) => (
        <div key={e.id} className={ui.field}>
          <span style={{ fontWeight: 600, fontSize: 14, padding: '0 4px' }}>{e.name}</span>
          <div className={ui.seg}>
            {RATINGS.map((r) => (
              <button
                key={r}
                className={`${ui.segBtn} ${(rating.get(e.id) ?? 'neutral') === r ? ui.segOn : ''}`}
                onClick={() => void db.exercisePrefs.put({ exerciseId: e.id, rating: r })}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      ))}
    </Page>
  );
}
