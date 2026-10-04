import { useState } from 'react';
import { db } from '../db/db';
import type { ISODate, Sleep } from '../db/types';
import { Sheet } from '../ui/Sheet';
import ui from '../ui/ui.module.css';

export function SleepSheet({ date, existing, onClose }: { date: ISODate; existing?: Sleep; onClose: () => void }) {
  const [bedtime, setBed] = useState(existing?.bedtime ?? '23:00');
  const [wake, setWake] = useState(existing?.wake ?? '07:00');
  const [quality, setQuality] = useState<Sleep['quality']>(existing?.quality);
  const save = () => {
    void db.sleeps.put({ date, bedtime, wake, quality });
    onClose();
  };
  return (
    <Sheet onClose={onClose} label="Last night">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className={ui.field}><span className={ui.label}>Bed</span><input type="time" value={bedtime} onChange={(e) => setBed(e.target.value)} /></label>
        <label className={ui.field}><span className={ui.label}>Up</span><input type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></label>
      </div>
      <div className={ui.field}>
        <span className={ui.label}>Quality (optional)</span>
        <div className={ui.seg}>
          {([1, 2, 3] as const).map((q) => (
            <button key={q} className={`${ui.segBtn} ${quality === q ? ui.segOn : ''}`} onClick={() => setQuality(quality === q ? undefined : q)}>
              {['Poor', 'Ok', 'Good'][q - 1]}
            </button>
          ))}
        </div>
      </div>
      <button className={ui.btnPrimary} onClick={save}>Save</button>
    </Sheet>
  );
}
