import { useRef, useState } from 'react';
import { db, newId } from '../db/db';
import { useSettings } from '../db/hooks';
import type { EstimateSource, ISODate, KcalRange, Meal, MealPreset, MealSlot } from '../db/types';
import { estimateMeal, fileToJpegBase64 } from '../domain/gemini';
import { formatKcalRange, sumRanges } from '../domain/summaries';
import { Sheet } from '../ui/Sheet';
import ui from '../ui/ui.module.css';
import s from './FoodSheet.module.css';

const SLOTS: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

function defaultSlot(): MealSlot {
  const h = new Date().getHours();
  return h < 10 ? 'breakfast' : h < 15 ? 'lunch' : h < 18 ? 'snack' : 'dinner';
}

function kcal(r: KcalRange): string {
  return `${r.low}–${r.high} kcal`;
}

/** Fuel, not deficit: ranges only, no targets, no red (SPEC §2.3). */
export function FoodSheet({ date, meals, presets, onClose }: { date: ISODate; meals: Meal[]; presets: MealPreset[]; onClose: () => void }) {
  const settings = useSettings();
  const [slot, setSlot] = useState<MealSlot>(defaultSlot());
  const [text, setText] = useState('');
  const [low, setLow] = useState('');
  const [high, setHigh] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, setPending] = useState<{ range: KcalRange; components: string[]; source: EstimateSource } | null>(null);
  const photo = useRef<HTMLInputElement>(null);
  const today = meals.filter((m) => m.date === date);

  const add = (m: Omit<Meal, 'id' | 'date' | 'slot' | 'size'>) => {
    void db.meals.add({ id: newId(), date, slot, size: 'normal', ...m });
  };

  async function ask(file?: File) {
    setErr(null);
    setBusy(true);
    try {
      const est = await estimateMeal({
        key: settings.geminiKey,
        model: settings.geminiModel,
        text,
        imageJpegBase64: file ? await fileToJpegBase64(file) : undefined,
      });
      setPending({ range: { low: est.low, high: est.high }, components: est.components, source: file ? 'photo' : 'text' });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Estimate failed');
    } finally {
      setBusy(false);
    }
  }

  const manualOk = Number(low) > 0 && Number(high) >= Number(low);

  return (
    <Sheet onClose={onClose} label={`Fuel · ${formatKcalRange(sumRanges(today))} so far`}>
      {today.map((m) => (
        <div key={m.id} className={ui.listRow}>
          <span>
            <span className={s.slot}>{m.slot}</span> {m.components.join(', ') || '—'}
            <span className={ui.caption}> · {m.estimateSource}</span>
          </span>
          <span className={s.right}>
            <span className={ui.caption}>{m.estimate ? kcal(m.estimate) : '—'}</span>
            <button className={s.x} aria-label="Remove" onClick={() => void db.meals.delete(m.id)}>×</button>
          </span>
        </div>
      ))}

      <div className={ui.seg}>
        {SLOTS.map((x) => (
          <button key={x} className={`${ui.segBtn} ${slot === x ? ui.segOn : ''}`} onClick={() => setSlot(x)}>
            {x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>

      {presets.length > 0 && (
        <div className={s.chips}>
          {presets.map((p) => (
            <button key={p.id} className={ui.chip} onClick={() => add({ components: [p.name], presetId: p.id, estimate: p.estimate, estimateSource: 'preset' })}>
              + {p.name} <span className={ui.caption}>{formatKcalRange(p.estimate)}</span>
            </button>
          ))}
        </div>
      )}

      <label className={ui.field}>
        <span className={ui.label}>What was it</span>
        <input value={text} placeholder="rice, tofu, greens" onChange={(e) => setText(e.target.value)} />
      </label>

      {settings.geminiKey && (
        <div className={s.ai}>
          <button className={ui.btn} disabled={busy || !text.trim()} onClick={() => void ask()}>{busy ? 'Estimating…' : 'Estimate from text'}</button>
          <button className={ui.btn} disabled={busy} onClick={() => photo.current?.click()}>Photo</button>
          <input
            ref={photo}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void ask(f);
            }}
          />
        </div>
      )}
      {err && <div className={ui.caption}>{err}</div>}
      {pending && (
        <div className={ui.inset}>
          <div>{pending.components.join(', ') || text}</div>
          <div className={s.pendingRow}>
            <span className={ui.num}>{kcal(pending.range)}</span>
            <button
              className={ui.btn}
              onClick={() => {
                add({ components: pending.components.length ? pending.components : [text], estimate: pending.range, estimateSource: pending.source });
                setPending(null);
                setText('');
              }}
            >
              Add
            </button>
          </div>
        </div>
      )}

      <div className={s.manual}>
        <input inputMode="numeric" placeholder="low kcal" value={low} onChange={(e) => setLow(e.target.value)} />
        <input inputMode="numeric" placeholder="high kcal" value={high} onChange={(e) => setHigh(e.target.value)} />
        <button
          className={ui.btn}
          disabled={!manualOk}
          onClick={() => {
            add({ components: text.trim() ? [text.trim()] : [], estimate: { low: Number(low), high: Number(high) }, estimateSource: 'manual' });
            setLow('');
            setHigh('');
            setText('');
          }}
        >
          Add
        </button>
      </div>
      {!settings.geminiKey && <div className={ui.caption}>Add a free Gemini key in Me › Settings for text and photo estimates.</div>}
    </Sheet>
  );
}
