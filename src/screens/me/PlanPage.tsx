import { db } from '../../db/db';
import type { AppData } from '../../db/useData';
import { ARCHETYPES, type Archetype, type PlanDay } from '../../db/types';
import { ARCHETYPE_INFO } from '../../domain/archetypes';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function PlanPage({ data, onBack }: { data: AppData; onBack: () => void }) {
  const get = (wd: number): PlanDay => data.planDays.find((p) => p.weekday === wd) ?? { weekday: wd, archetype: 'rest' };
  const put = (p: PlanDay) => void db.planDays.put(p);
  return (
    <Page title="Weekly plan" onBack={onBack}>
      <div className={ui.body2} style={{ padding: '0 4px' }}>
        Today shows this. EASE or REST FINGERS readiness swaps a high-finger day down.
      </div>
      {DAYS.map((name, wd) => {
        const p = get(wd);
        return (
          <div key={wd} className={ui.card} style={{ gap: 8 }}>
            <div className={ui.spread}>
              <span style={{ fontWeight: 700 }}>{name}</span>
              {p.archetype !== 'rest' && <span className={ui.dot} style={{ background: `var(${ARCHETYPE_INFO[p.archetype].accent})` }} />}
            </div>
            <select value={p.archetype} onChange={(e) => put({ ...p, archetype: e.target.value as Archetype | 'rest' })}>
              <option value="rest">Rest</option>
              {ARCHETYPES.map((a) => <option key={a} value={a}>{ARCHETYPE_INFO[a].name}</option>)}
            </select>
            {p.archetype !== 'rest' && (
              <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr', gap: 8 }}>
                <input inputMode="numeric" placeholder="min" value={p.minutes ?? ''} onChange={(e) => put({ ...p, minutes: Number(e.target.value) || undefined })} />
                <input placeholder="note, e.g. crimps first" value={p.note ?? ''} onChange={(e) => put({ ...p, note: e.target.value || undefined })} />
              </div>
            )}
          </div>
        );
      })}
    </Page>
  );
}
