import { useState } from 'react';
import type { OpenForm } from '../App';
import { startLiveSession } from '../db/actions';
import { setSetting, useSettings } from '../db/hooks';
import { useData } from '../db/useData';
import { ARCHETYPE_INFO, ARCHETYPE_ORDER } from '../domain/archetypes';
import { dayMonth, weekdayShort } from '../domain/dates';
import { archetypeName, sessionSummary } from '../domain/describeSession';
import { GymSheet } from '../forms/LimitForm';
import { GYMS } from '../grades/gyms';
import ui from '../ui/ui.module.css';
import s from './LogScreen.module.css';

export function LogScreen({ open }: { open: (f: OpenForm) => void }) {
  const data = useData();
  const settings = useSettings();
  const [gymSheet, setGymSheet] = useState(false);
  const gyms = data?.gyms ?? GYMS;
  const gym = gyms.find((g) => g.id === settings.lastGymId) ?? gyms[0];
  const recent = [...(data?.sessions ?? [])].sort((a, b) => (a.date === b.date ? b.startedAt - a.startedAt : a.date < b.date ? 1 : -1)).slice(0, 12);

  return (
    <div className={ui.screen}>
      <div className={ui.header}>
        <span className={ui.title}>Log</span>
        <button className={ui.chip} onClick={() => setGymSheet(true)}>
          <span className={ui.dot} style={{ background: 'var(--mint)' }} />
          {gym.name} · {settings.gradeDisplay}
        </button>
      </div>

      <div className={s.grid}>
        {ARCHETYPE_ORDER.map((a) => {
          const info = ARCHETYPE_INFO[a];
          return (
            <button
              key={a}
              className={s.tile}
              onClick={() => (a === 'limit' ? void startLiveSession('limit', gym.id) : open({ kind: 'new', archetype: a }))}
            >
              <span className={s.accent} style={{ background: `var(${info.accent})` }} />
              <span className={s.name}>{info.name}</span>
              <span className={s.hint}>{info.hint}</span>
              <span className={s.meterWrap}>
                <span className={s.meter}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{ background: i < info.meter ? `var(${info.accent})` : 'var(--line)' }} />
                  ))}
                </span>
                <span className={ui.caption}>FINGER · {info.fingerClass}</span>
              </span>
            </button>
          );
        })}
      </div>

      {recent.length > 0 && data && (
        <div className={ui.card}>
          <span className={ui.label}>Last logged</span>
          {recent.map((x) => (
            <button key={x.id} className={ui.listRow} onClick={() => open({ kind: 'edit', sessionId: x.id })}>
              <span className={s.recent}>
                <span className={ui.dot} style={{ background: `var(${ARCHETYPE_INFO[x.archetype].accent})` }} />
                <span>
                  <span className={s.recentName}>{weekdayShort(x.date)} {dayMonth(x.date)} · {archetypeName(x)}</span>
                  <span className={ui.caption}> {sessionSummary(x, data.problems, data.setRows)}</span>
                </span>
              </span>
              <span className={ui.caption}>Edit</span>
            </button>
          ))}
        </div>
      )}

      {gymSheet && (
        <GymSheet
          gyms={gyms}
          current={gym.id}
          onPick={(g) => {
            void setSetting('lastGymId', g.id);
            setGymSheet(false);
          }}
          onClose={() => setGymSheet(false)}
        />
      )}
    </div>
  );
}
