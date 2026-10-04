import { useState } from 'react';
import { db, newId } from '../../db/db';
import { BODY_AREAS, type BodyArea, type BodyNote, type NiggleStatus } from '../../db/types';
import { dayMonthTitle, todayISO } from '../../domain/dates';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

const STATUSES: NiggleStatus[] = ['watching', 'hurting', 'resolved'];

export function NotesPage({ kind, notes, onBack }: { kind: BodyNote['kind']; notes: BodyNote[]; onBack: () => void }) {
  const [text, setText] = useState('');
  const [area, setArea] = useState<BodyArea>('finger');
  const mine = notes.filter((n) => n.kind === kind).sort((a, b) => (a.date < b.date ? 1 : -1));
  const niggle = kind === 'niggle';

  return (
    <Page title={niggle ? 'Niggles' : 'Weakness notes'} onBack={onBack}>
      <div className={ui.card}>
        <input placeholder={niggle ? 'L ring A2' : 'crimps feel worse than slopers'} value={text} onChange={(e) => setText(e.target.value)} />
        {niggle && (
          <select value={area} onChange={(e) => setArea(e.target.value as BodyArea)}>
            {BODY_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <button
          className={ui.btnPrimary}
          disabled={!text.trim()}
          onClick={() => {
            void db.bodyNotes.add({
              id: newId(), date: todayISO(), kind, text: text.trim(),
              ...(niggle ? { area, status: 'watching' as const } : {}),
            });
            setText('');
          }}
        >
          Add
        </button>
        {niggle && <div className={ui.caption}>Finger + hurting forces REST FINGERS. Wrist or elbow + hurting eases one step.</div>}
      </div>
      {mine.map((n) => (
        <div key={n.id} className={ui.card} style={{ gap: 8 }}>
          <div className={ui.spread}>
            <span style={{ fontWeight: 600 }}>{n.text}</span>
            <span className={ui.caption}>{n.area ? `${n.area} · ` : ''}{dayMonthTitle(n.date)}</span>
          </div>
          {niggle && (
            <div className={ui.seg}>
              {STATUSES.map((st) => (
                <button
                  key={st}
                  className={`${ui.segBtn} ${n.status === st ? ui.segOn : ''}`}
                  style={n.status === st && st === 'watching' ? { background: 'var(--jasmine)' } : undefined}
                  onClick={() => void db.bodyNotes.update(n.id, { status: st })}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
          <button className={ui.caption} style={{ alignSelf: 'flex-start', minHeight: 44 }} onClick={() => void db.bodyNotes.delete(n.id)}>Delete</button>
        </div>
      ))}
    </Page>
  );
}
