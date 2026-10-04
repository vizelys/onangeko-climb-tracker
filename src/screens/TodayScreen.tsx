import { useRef, useState } from 'react';
import type { OpenForm } from '../App';
import { startLiveSession } from '../db/actions';
import { db } from '../db/db';
import { useSettings } from '../db/hooks';
import { useData, type AppData } from '../db/useData';
import { HABITS, type Archetype, type BodyNote, type CheckIn, type Habit, type HabitTick, type Level } from '../db/types';
import { ARCHETYPE_INFO } from '../domain/archetypes';
import { addDays, dayMonth, dayMonthTitle, isoWeek, todayISO, weekdayMon0, weekdayName, weekdayShort } from '../domain/dates';
import { loadView } from '../domain/loadView';
import { adjustPlan } from '../domain/readiness';
import { formatHm, formatKcalRange, isTrainingDay, sleepMinutes, sumRanges, wakeDrift } from '../domain/summaries';
import { FoodSheet } from '../sheets/FoodSheet';
import { SleepSheet } from '../sheets/SleepSheet';
import ui from '../ui/ui.module.css';
import s from './TodayScreen.module.css';

export function TodayScreen({ open }: { open: (f: OpenForm) => void }) {
  const data = useData();
  const today = todayISO();
  const [sheet, setSheet] = useState<'sleep' | 'food' | null>(null);
  if (!data) return null;

  return (
    <div className={ui.screen}>
      <div className={ui.header}>
        <span className={ui.title}>{weekdayName(today)}</span>
        <span className={ui.meta}>{dayMonth(today)} · WK {isoWeek(today)}</span>
      </div>
      <PlanCard data={data} today={today} open={open} />
      <HabitDots ticks={data.habitTicks} today={today} />
      <div className={s.tiles}>
        <SleepTile data={data} today={today} onTap={() => setSheet('sleep')} />
        <FuelTile data={data} today={today} onTap={() => setSheet('food')} />
      </div>
      <FeelRow checkIns={data.checkIns} today={today} />
      <Supplements data={data} today={today} />

      {sheet === 'sleep' && <SleepSheet date={today} existing={data.sleeps.find((x) => x.date === today)} onClose={() => setSheet(null)} />}
      {sheet === 'food' && <FoodSheet date={today} meals={data.meals} presets={data.mealPresets} onClose={() => setSheet(null)} />}
    </div>
  );
}

/** Latest relevant note: an open finger niggle on a finger day, else the latest weakness. */
export function relevantNote(notes: BodyNote[], archetype: Archetype | 'rest'): BodyNote | undefined {
  const byDate = [...notes].sort((a, b) => (a.date < b.date ? 1 : -1));
  if (archetype !== 'rest' && ARCHETYPE_INFO[archetype].weight > 0) {
    const n = byDate.find((x) => x.kind === 'niggle' && x.area === 'finger' && x.status !== 'resolved');
    if (n) return n;
  }
  return byDate.find((x) => x.kind === 'weakness');
}

function PlanCard({ data, today, open }: { data: AppData; today: string; open: (f: OpenForm) => void }) {
  const settings = useSettings();
  const plan = data.planDays.find((p) => p.weekday === weekdayMon0(today));
  const { readiness } = loadView(data, today);
  const archetype = adjustPlan(plan, readiness.state);
  const swapped = plan && plan.archetype !== archetype;
  const done = data.sessions.filter((x) => x.date === today);
  const gym = data.gyms.find((g) => g.id === settings.lastGymId);

  if (archetype === 'rest') {
    return (
      <div className={ui.card}>
        <span className={ui.label}>{plan ? 'Planned · rest' : 'No plan for today'}</span>
        <div className={s.planTitle}>Rest day</div>
        <div className={ui.body2}>{plan ? (plan.note ?? 'Mobility or a walk if you feel like it.') : 'Set a weekly plan in Me › Weekly plan.'}</div>
        {done.length > 0 && <div className={s.done}>✓ Logged {done.map((d) => ARCHETYPE_INFO[d.archetype].name.toLowerCase()).join(', ')}</div>}
      </div>
    );
  }

  const info = ARCHETYPE_INFO[archetype];
  const note = relevantNote(data.bodyNotes, archetype);
  const doneIt = done.find((d) => d.archetype === archetype);
  return (
    <div className={ui.card}>
      <div className={ui.spread}>
        <span className={ui.label} style={{ color: `var(${info.accent})` }}>
          Planned · finger load {info.fingerClass.toLowerCase()}
        </span>
        {plan?.minutes && <span className={ui.caption}>{plan.minutes} MIN</span>}
      </div>
      <div>
        <div className={s.planTitle}>{info.name}</div>
        <div className={s.planSub}>
          {swapped
            ? `Swapped from ${ARCHETYPE_INFO[plan.archetype as Archetype].name.toLowerCase()} · ${readiness.state === 'REST' ? 'rest fingers' : 'ease'} today`
            : [archetype === 'limit' ? gym?.name : undefined, plan?.note].filter(Boolean).join(' · ') || info.hint}
        </div>
      </div>
      {note && (
        <div className={ui.inset}>
          {note.kind === 'niggle' ? `Watching, ${dayMonthTitle(note.date)}: ` : `Your note, ${dayMonthTitle(note.date)}: `}“{note.text}”
        </div>
      )}
      {doneIt ? (
        <div className={s.done}>✓ Done · {doneIt.duration} min</div>
      ) : (
        <button
          className={s.start}
          style={{ background: `var(${info.accent})` }}
          onClick={() => (archetype === 'limit' ? void startLiveSession('limit', settings.lastGymId) : open({ kind: 'new', archetype }))}
        >
          Start session
        </button>
      )}
    </div>
  );
}

const HABIT_LABEL: Record<Habit, string> = { stretch: 'Stretch', read: 'Read', guitar: 'Guitar', mind: 'Mind' };
const LONG_PRESS_MS = 500;

function HabitDots({ ticks, today }: { ticks: HabitTick[]; today: string }) {
  return (
    <div className={s.habits}>
      {HABITS.map((h) => (
        <HabitDot key={h} habit={h} tick={ticks.find((t) => t.date === today && t.habit === h)} today={today} />
      ))}
    </div>
  );
}

/** Tap marks done; a 500ms long-press undoes. Done or not — no partial states. */
function HabitDot({ habit, tick, today }: { habit: Habit; tick?: HabitTick; today: string }) {
  const timer = useRef<number | undefined>(undefined);
  const fired = useRef(false);
  const [pressing, setPressing] = useState(false);
  const done = tick?.done === true;

  const down = () => {
    fired.current = false;
    if (!done) return;
    setPressing(true);
    timer.current = window.setTimeout(() => {
      fired.current = true;
      setPressing(false);
      void db.habitTicks.delete([today, habit]);
    }, LONG_PRESS_MS);
  };
  const cancel = () => {
    window.clearTimeout(timer.current);
    setPressing(false);
  };
  const up = () => {
    cancel();
    if (!fired.current && !done) void db.habitTicks.put({ date: today, habit, done: true, durationSec: tick?.durationSec });
  };

  const mins = tick?.durationSec ? `${Math.round(tick.durationSec / 60)}m` : null;
  return (
    <button
      className={s.habit}
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`${s.habitDot} ${done ? s.habitDone : ''} ${pressing ? s.habitUndo : ''}`}>{done ? (mins ?? '✓') : ''}</span>
      <span className={s.habitLabel} style={{ color: done ? 'var(--ink)' : 'var(--ink-2)' }}>{HABIT_LABEL[habit]}</span>
    </button>
  );
}

function SleepTile({ data, today, onTap }: { data: AppData; today: string; onTap: () => void }) {
  const settings = useSettings();
  const sl = data.sleeps.find((x) => x.date === today);
  const hm = sl ? formatHm(sleepMinutes(sl)) : null;
  const drift = sl ? wakeDrift(sl, settings.alarm) : 0;
  return (
    <button className={s.tile} onClick={onTap}>
      <span className={ui.label}>Sleep</span>
      {hm ? (
        <span className={`${ui.num} ${s.big}`}>
          {hm.h}<span className={s.unit}>h</span>{hm.m}
        </span>
      ) : (
        <span className={`${ui.num} ${s.big} ${s.dim}`}>—</span>
      )}
      <span className={s.tileCap}>
        {sl ? `Up ${sl.wake} · ${drift >= 0 ? '+' : '−'}${Math.abs(drift)}m on alarm` : 'Tap to log last night'}
      </span>
    </button>
  );
}

const FUEL_SCALE = 3500;

function FuelTile({ data, today, onTap }: { data: AppData; today: string; onTap: () => void }) {
  const settings = useSettings();
  const intake = sumRanges(data.meals.filter((m) => m.date === today));
  const plan = data.planDays.find((p) => p.weekday === weekdayMon0(today));
  const training = isTrainingDay(today, data.sessions, data.loads) || (plan !== undefined && plan.archetype !== 'rest');
  const demand = training ? settings.demandTraining : settings.demandRest;
  const pct = (n: number) => `${Math.min(100, (n / FUEL_SCALE) * 100)}%`;
  return (
    <button className={s.tile} onClick={onTap}>
      <span className={ui.label}>Fuel so far</span>
      <span className={`${ui.num} ${s.fuel}`}>{formatKcalRange(intake)}</span>
      <span className={s.track}>
        <span className={s.demand} style={{ left: pct(demand.low), width: `calc(${pct(demand.high)} - ${pct(demand.low)})` }} />
        <span className={s.intakeLow} style={{ width: pct(intake.low) }} />
        <span className={s.intakeHigh} style={{ width: pct(intake.high) }} />
      </span>
      <span className={s.tileCap}>vs {formatKcalRange(demand)} {training ? 'climbing day' : 'rest day'}</span>
    </button>
  );
}

const LEVELS: Level[] = ['low', 'ok', 'high'];
const FEEL_FIELDS: { key: 'energy' | 'soreness' | 'motivation'; label: string }[] = [
  { key: 'energy', label: 'Energy' },
  { key: 'soreness', label: 'Sore' },
  { key: 'motivation', label: 'Keen' },
];

function feelSummary(c: Pick<CheckIn, 'energy' | 'soreness' | 'motivation'>): string {
  return FEEL_FIELDS.map((f) => `${f.label} ${c[f.key]}`).join(' · ');
}

function FeelRow({ checkIns, today }: { checkIns: CheckIn[]; today: string }) {
  const [expanded, setExpanded] = useState(false);
  const yesterday = addDays(today, -1);
  const mine = checkIns.find((c) => c.date === today);
  const prev = checkIns.find((c) => c.date === yesterday);
  const shown = mine ?? prev ?? { energy: 'ok' as Level, soreness: 'low' as Level, motivation: 'ok' as Level };

  const set = (patch: Partial<CheckIn>) => void db.checkIns.put({ ...shown, ...mine, ...patch, date: today });

  return (
    <div className={s.feel}>
      <div className={s.feelTop}>
        <button className={s.feelText} onClick={() => setExpanded((e) => !e)}>
          <span className={ui.label}>How I feel</span>
          <span className={s.feelSummary}>{feelSummary(shown)}</span>
        </button>
        {mine ? (
          <span className={s.logged}>✓ Logged</span>
        ) : (
          <button className={s.same} onClick={() => set({})}>
            {prev ? `Same as ${weekdayShort(yesterday)}` : 'Log'}
          </button>
        )}
      </div>
      {expanded && (
        <div className={s.scales}>
          {FEEL_FIELDS.map((f) => (
            <div key={f.key} className={s.scale}>
              <span className={s.scaleLabel}>{f.label}</span>
              <div className={ui.seg} style={{ flex: 1 }}>
                {LEVELS.map((l) => (
                  <button key={l} className={`${ui.segBtn} ${mine?.[f.key] === l ? ui.segOn : ''}`} onClick={() => set({ [f.key]: l })}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Supplements({ data, today }: { data: AppData; today: string }) {
  const wd = weekdayMon0(today);
  const due = data.supplements.filter((x) => (x.schedule.length === 0 || x.schedule.includes(wd)) && (!x.startDate || x.startDate <= today));
  if (due.length === 0) return null;
  return (
    <div className={s.supps}>
      {due.map((sp) => {
        const taken = data.supplementTicks.some((t) => t.date === today && t.supplementId === sp.id && t.taken);
        return (
          <button
            key={sp.id}
            className={`${s.supp} ${taken ? s.suppTaken : ''}`}
            onClick={() =>
              taken ? void db.supplementTicks.delete([today, sp.id]) : void db.supplementTicks.put({ date: today, supplementId: sp.id, taken: true })
            }
          >
            {taken && <span className={s.check}>✓</span>}
            {sp.name}
          </button>
        );
      })}
    </div>
  );
}
