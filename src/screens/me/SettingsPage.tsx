import { useState } from 'react';
import { setSetting, useSettings } from '../../db/hooks';
import type { KcalRange } from '../../db/types';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

function RangeField({ label, value, onChange }: { label: string; value: KcalRange; onChange: (r: KcalRange) => void }) {
  return (
    <div className={ui.field}>
      <span className={ui.label}>{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input inputMode="numeric" defaultValue={value.low} onBlur={(e) => onChange({ ...value, low: Number(e.target.value) || value.low })} />
        <input inputMode="numeric" defaultValue={value.high} onBlur={(e) => onChange({ ...value, high: Number(e.target.value) || value.high })} />
      </div>
    </div>
  );
}

export function SettingsPage({ onBack }: { onBack: () => void }) {
  const st = useSettings();
  const [key, setKey] = useState(st.geminiKey);
  return (
    <Page title="Settings" onBack={onBack}>
      <div className={ui.card}>
        <div className={ui.field}>
          <span className={ui.label}>Grade display</span>
          <div className={ui.seg}>
            {(['Font', 'V'] as const).map((d) => (
              <button key={d} className={`${ui.segBtn} ${st.gradeDisplay === d ? ui.segOn : ''}`} onClick={() => void setSetting('gradeDisplay', d)}>{d}</button>
            ))}
          </div>
          <span className={ui.caption}>Font is always what is stored.</span>
        </div>
        <div className={ui.field}>
          <span className={ui.label}>Fine grade row in picker</span>
          <div className={ui.seg}>
            {[true, false].map((v) => (
              <button key={String(v)} className={`${ui.segBtn} ${st.showFineRow === v ? ui.segOn : ''}`} onClick={() => void setSetting('showFineRow', v)}>{v ? 'Show' : 'Hide'}</button>
            ))}
          </div>
        </div>
        <label className={ui.field}>
          <span className={ui.label}>Alarm (for wake drift)</span>
          <input type="time" value={st.alarm} onChange={(e) => void setSetting('alarm', e.target.value || st.alarm)} />
        </label>
      </div>

      <div className={ui.card}>
        <span className={ui.label}>Fuel demand · kcal</span>
        <RangeField label="Rest day" value={st.demandRest} onChange={(r) => void setSetting('demandRest', r)} />
        <RangeField label="Training day" value={st.demandTraining} onChange={(r) => void setSetting('demandTraining', r)} />
      </div>

      <div className={ui.card}>
        <span className={ui.label}>Meal estimates · Gemini (optional)</span>
        <div className={ui.body2}>
          A free key from aistudio.google.com enables text and photo estimates. The key stays on this phone and is sent
          only to Google. Free-tier prompts may be used by Google to improve its models.
        </div>
        <input type="password" placeholder="API key" value={key} onChange={(e) => setKey(e.target.value)} onBlur={() => void setSetting('geminiKey', key.trim())} />
        <input placeholder="model" defaultValue={st.geminiModel} onBlur={(e) => void setSetting('geminiModel', e.target.value.trim() || 'gemini-flash-latest')} />
      </div>
    </Page>
  );
}
