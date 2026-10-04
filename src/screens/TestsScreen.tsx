import { useState } from 'react';
import { db, newId } from '../db/db';
import { useData } from '../db/useData';
import type { TestResult } from '../db/types';
import { dayMonthTitle, daysBetween, todayISO } from '../domain/dates';
import { BATTERY, isStale, latestResult, type BenchmarkTest } from '../domain/summaries';
import { Sheet } from '../ui/Sheet';
import ui from '../ui/ui.module.css';
import s from './TestsScreen.module.css';

/** "Am I actually getting stronger?" */
export function TestsScreen() {
  const data = useData();
  const [running, setRunning] = useState<BenchmarkTest | null>(null);
  if (!data) return null;
  const today = todayISO();

  const fmt = (t: BenchmarkTest, v: number) => (t.unit === 'kg' && v > 0 ? `+${v}` : String(v));

  return (
    <div className={ui.screen}>
      <div className={ui.header}>
        <span className={ui.title}>Tests</span>
      </div>

      {BATTERY.map((t) => {
        const latest = latestResult(data.testResults, t.id);
        if (!latest || !isStale(latest, today)) return null;
        const weeks = Math.floor(daysBetween(latest.date, today) / 7);
        return (
          <div key={t.id} className={s.stale}>
            <span className={ui.label} style={{ color: 'var(--jasmine)' }}>{weeks} weeks stale</span>
            <span className={s.staleName}>{t.name}</span>
            <span className={ui.body2}>Last {fmt(t, latest.value)} {t.unit} · {dayMonthTitle(latest.date)}</span>
            <button className={s.run} onClick={() => setRunning(t)}>Run test</button>
          </div>
        );
      })}

      <div className={ui.card}>
        {BATTERY.map((t) => {
          const history = data.testResults
            .filter((r) => r.testId === t.id)
            .sort((a, b) => (a.date < b.date ? -1 : 1))
            .slice(-6);
          const latest = history[history.length - 1];
          const prev = history[history.length - 2];
          const max = Math.max(1, ...history.map((h) => Math.abs(h.value)));
          return (
            <button key={t.id} className={s.row} onClick={() => setRunning(t)}>
              <span className={s.rowText}>
                <span className={s.name}>{t.name}</span>
                <span className={s.cond}>{latest?.conditions ?? t.conditions}</span>
              </span>
              <span className={s.hist}>
                {Array.from({ length: 6 }, (_, i) => {
                  const h = history[i - (6 - history.length)];
                  return (
                    <span
                      key={i}
                      style={{
                        height: h ? `${Math.max(10, (Math.abs(h.value) / max) * 100)}%` : '10%',
                        background: h === latest && h ? 'var(--ink)' : h ? 'var(--line-strong)' : 'var(--line-soft)',
                      }}
                    />
                  );
                })}
              </span>
              <span className={s.value}>
                {latest ? (
                  <>
                    <span className={`${ui.num} ${s.valNum}`}>{fmt(t, latest.value)}<span className={s.valUnit}>{t.unit}</span></span>
                    <span className={ui.caption}>
                      {prev ? `${latest.value - prev.value >= 0 ? '+' : '−'}${Math.abs(+(latest.value - prev.value).toFixed(1))} · ` : ''}
                      {dayMonthTitle(latest.date)}
                    </span>
                  </>
                ) : (
                  <span className={ui.caption}>Not run</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {running && <RunSheet test={running} results={data.testResults} onClose={() => setRunning(null)} />}
    </div>
  );
}

function RunSheet({ test, results, onClose }: { test: BenchmarkTest; results: TestResult[]; onClose: () => void }) {
  const last = latestResult(results, test.id);
  const [value, setValue] = useState(last ? String(last.value) : '');
  const [conditions, setConditions] = useState(last?.conditions ?? test.conditions);
  const [date, setDate] = useState(todayISO());
  const v = parseFloat(value.replace(',', '.'));
  const mine = results.filter((r) => r.testId === test.id).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <Sheet onClose={onClose} label={test.name}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label className={ui.field}><span className={ui.label}>Result · {test.unit}</span><input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></label>
        <label className={ui.field}><span className={ui.label}>Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value || todayISO())} /></label>
      </div>
      <label className={ui.field}><span className={ui.label}>Conditions</span><input value={conditions} onChange={(e) => setConditions(e.target.value)} /></label>
      <button
        className={ui.btnPrimary}
        disabled={!Number.isFinite(v)}
        onClick={() => {
          void db.testResults.add({ id: newId(), date, testId: test.id, value: v, unit: test.unit, conditions: conditions.trim() || undefined });
          onClose();
        }}
      >
        Save result
      </button>
      {mine.map((r) => (
        <div key={r.id} className={ui.listRow}>
          <span className={ui.body2}>{dayMonthTitle(r.date)} · {r.value} {r.unit}</span>
          <button className={ui.caption} style={{ minHeight: 44 }} onClick={() => void db.testResults.delete(r.id)}>Delete</button>
        </div>
      ))}
    </Sheet>
  );
}
