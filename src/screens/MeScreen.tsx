import { useEffect, useState } from 'react';
import type { OpenForm } from '../App';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { useData, type AppData } from '../db/useData';
import { addDays, todayISO, weekdayShort } from '../domain/dates';
import {
  SLEEP_GOOD_MIN, SLEEP_TARGET_MIN, formatHm, formatKcalRange, isTrainingDay, sleepMinutes, sumRanges, wakeDrift,
} from '../domain/summaries';
import { Sheet } from '../ui/Sheet';
import ui from '../ui/ui.module.css';
import s from './MeScreen.module.css';
import { DataPage } from './me/DataPage';
import { EquipmentPage, PrefsPage } from './me/EquipmentPages';
import { GymsPage } from './me/GymsPage';
import { NotesPage } from './me/NotesPage';
import { PlanPage } from './me/PlanPage';
import { PresetsPage, SupplementsPage } from './me/ListPages';
import { SettingsPage } from './me/SettingsPage';

type Page = 'plan' | 'equipment' | 'prefs' | 'weakness' | 'niggle' | 'supplements' | 'gyms' | 'presets' | 'settings' | 'data';

export function MeScreen(_props: { open: (f: OpenForm) => void }) {
  const data = useData();
  const [page, setPage] = useState<Page | null>(null);
  const [timer, setTimer] = useState(false);
  if (!data) return null;
  const today = todayISO();

  if (page) {
    const back = () => setPage(null);
    switch (page) {
      case 'plan': return <PlanPage data={data} onBack={back} />;
      case 'equipment': return <EquipmentPage onBack={back} />;
      case 'prefs': return <PrefsPage onBack={back} />;
      case 'weakness': return <NotesPage kind="weakness" notes={data.bodyNotes} onBack={back} />;
      case 'niggle': return <NotesPage kind="niggle" notes={data.bodyNotes} onBack={back} />;
      case 'supplements': return <SupplementsPage items={data.supplements} onBack={back} />;
      case 'gyms': return <GymsPage gyms={data.gyms} onBack={back} />;
      case 'presets': return <PresetsPage items={data.mealPresets} onBack={back} />;
      case 'settings': return <SettingsPage onBack={back} />;
      case 'data': return <DataPage onBack={back} />;
    }
  }

  const watching = data.bodyNotes.filter((n) => n.kind === 'niggle' && n.status !== 'resolved').length;
  const rows: [Page, string, string?][] = [
    ['plan', 'Weekly plan'],
    ['equipment', 'Equipment'],
    ['prefs', 'Exercise preferences'],
    ['weakness', 'Weakness notes'],
    ['niggle', 'Niggles', watching ? String(watching) : undefined],
    ['supplements', 'Supplements'],
    ['gyms', 'Gyms'],
    ['presets', 'Food presets'],
    ['settings', 'Settings'],
    ['data', 'Export / import'],
  ];

  return (
    <div className={ui.screen}>
      <div className={ui.header}><span className={ui.title}>Me</span></div>
      <SleepCard data={data} today={today} />
      <FuelCard data={data} today={today} />
      <MindRow data={data} today={today} onStart={() => setTimer(true)} />
      <div className={ui.card} style={{ gap: 0, paddingTop: 4, paddingBottom: 4 }}>
        {rows.map(([id, label, badge]) => (
          <button key={id} className={ui.listRow} onClick={() => setPage(id)}>
            <span>{label}</span>
            <span className={s.rowRight}>
              {badge && <span className={s.badge}>{badge}</span>}
              <span className={s.chev}>›</span>
            </span>
          </button>
        ))}
        <div className={ui.listRow}>
          <span style={{ color: 'var(--ink-3)' }}>Body weight</span>
          <span className={ui.caption}>OFF</span>
        </div>
      </div>
      {timer && <MindTimer today={today} existing={data.habitTicks.find((t) => t.date === today && t.habit === 'mind')?.durationSec ?? 0} onClose={() => setTimer(false)} />}
    </div>
  );
}

function SleepCard({ data, today }: { data: AppData; today: string }) {
  const settings = useSettings();
  const nights = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => ({ d, sl: data.sleeps.find((x) => x.date === d) }));
  const max = 10 * 60;
  const logged = nights.filter((n) => n.sl);
  const drift = logged.length ? Math.round(logged.reduce((a, n) => a + (n.sl ? wakeDrift(n.sl, settings.alarm) : 0), 0) / logged.length) : null;
  const avg = logged.length ? logged.reduce((a, n) => a + (n.sl ? sleepMinutes(n.sl) : 0), 0) / logged.length : null;
  return (
    <div className={ui.card}>
      <div className={ui.spread}>
        <span className={ui.label}>Sleep · 7 nights</span>
        {avg !== null && <span className={ui.caption}>AVG {formatHm(avg).h}h{formatHm(avg).m}</span>}
      </div>
      <div className={s.sleepBars}>
        <span className={s.target} style={{ bottom: `${(SLEEP_TARGET_MIN / max) * 100}%` }} />
        {nights.map(({ d, sl }) => {
          const m = sl ? sleepMinutes(sl) : 0;
          return (
            <span key={d} className={s.sleepCol}>
              <span className={s.sleepBar} style={{ height: sl ? `${(Math.min(m, max) / max) * 100}%` : '3%', background: sl ? (m >= SLEEP_GOOD_MIN ? 'var(--aqua)' : 'var(--aqua-dim)') : 'var(--line)' }} />
            </span>
          );
        })}
      </div>
      <div className={s.days}>{nights.map(({ d }) => <span key={d}>{weekdayShort(d)[0]}</span>)}</div>
      <span className={ui.body2}>
        {drift === null ? 'No nights logged this week.' : `Wake drift ${drift >= 0 ? '+' : '−'}${Math.abs(drift)}m vs ${settings.alarm} alarm`}
      </span>
    </div>
  );
}

const FUEL_LO = 1500;
const FUEL_HI = 3500;

function FuelCard({ data, today }: { data: AppData; today: string }) {
  const settings = useSettings();
  const pos = (n: number) => `${Math.min(100, Math.max(0, ((n - FUEL_LO) / (FUEL_HI - FUEL_LO)) * 100))}%`;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6)).map((d) => {
    const meals = data.meals.filter((m) => m.date === d);
    const training = isTrainingDay(d, data.sessions, data.loads);
    const demand = training ? settings.demandTraining : settings.demandRest;
    return { d, meals, intake: sumRanges(meals), training, demand };
  });
  const lowClimb = days.filter((x) => x.d !== today && x.training && x.meals.length > 0 && x.intake.high < x.demand.low);
  return (
    <div className={ui.card}>
      <div className={ui.spread}>
        <span className={ui.label}>Fuel vs training</span>
        <span className={ui.caption}>1.5–3.5k</span>
      </div>
      {days.map((x) => (
        <div key={x.d} className={s.fuelRow}>
          <span className={s.fuelDay}>{weekdayShort(x.d)}</span>
          <span className={ui.dot} style={{ background: x.training ? 'var(--strawberry)' : 'transparent' }} />
          <span className={s.fuelTrack}>
            <span className={s.fuelDemand} style={{ left: pos(x.demand.low), width: `calc(${pos(x.demand.high)} - ${pos(x.demand.low)})` }} />
            {x.meals.length > 0 && (
              <span className={s.fuelIntake} style={{ left: pos(x.intake.low), width: `max(4px, calc(${pos(x.intake.high)} - ${pos(x.intake.low)}))` }} />
            )}
          </span>
          <span className={s.fuelNum}>{x.meals.length ? formatKcalRange(x.intake) : '–'}</span>
        </div>
      ))}
      <span className={ui.body2}>
        {lowClimb.length === 0
          ? 'Climbing days this week were fuelled.'
          : `${lowClimb.map((x) => weekdayShort(x.d)).join(', ')} came in under a climbing day — worth a bigger meal around the next session.`}
      </span>
    </div>
  );
}

function MindRow({ data, today, onStart }: { data: AppData; today: string; onStart: () => void }) {
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i));
  const ticks = data.habitTicks.filter((t) => t.habit === 'mind' && t.done && days.includes(t.date));
  const timed = ticks.filter((t) => t.durationSec);
  const avg = timed.length ? Math.round(timed.reduce((a, t) => a + (t.durationSec ?? 0), 0) / timed.length / 60) : 0;
  return (
    <div className={`${ui.card} ${s.mind}`}>
      <div>
        <div className={ui.label}>Mindfulness</div>
        <div className={s.mindText}>{ticks.length} of 14 days{avg ? ` · ${avg} min avg` : ''}</div>
      </div>
      <button className={ui.btn} onClick={onStart}>Start timer</button>
    </div>
  );
}

function MindTimer({ today, existing, onClose }: { today: string; existing: number; onClose: () => void }) {
  const [start] = useState(Date.now());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const sec = Math.floor((now - start) / 1000);
  const stop = () => {
    if (sec >= 30) void db.habitTicks.put({ date: today, habit: 'mind', done: true, durationSec: existing + sec });
    onClose();
  };
  return (
    <Sheet onClose={stop} label="Mindfulness">
      <div className={`${ui.num} ${s.timer}`}>{String(Math.floor(sec / 60)).padStart(2, '0')}:{String(sec % 60).padStart(2, '0')}</div>
      <button className={ui.btnPrimary} onClick={stop}>Stop{sec >= 30 ? ' and log' : ''}</button>
      <div className={ui.caption}>Under 30 seconds is not logged.</div>
    </Sheet>
  );
}
