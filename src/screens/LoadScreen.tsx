import { useSettings } from '../db/hooks';
import { useData } from '../db/useData';
import { ARCHETYPE_INFO } from '../domain/archetypes';
import { dayMonth, dayMonthTitle, todayISO, weekdayShort } from '../domain/dates';
import { loadView } from '../domain/loadView';
import { dailySessionLoad, gradePyramid } from '../domain/summaries';
import { bandForGrade } from '../grades/convert';
import { formatGrade } from '../grades/scale';
import { isDark } from '../ui/color';
import ui from '../ui/ui.module.css';
import s from './LoadScreen.module.css';

const STATE_COLOR = { GO: 'var(--mint)', EASE: 'var(--jasmine)', REST: 'var(--strawberry)' } as const;

/** Read-only: "Am I ready to go hard, or should I back off?" */
export function LoadScreen() {
  const data = useData();
  const settings = useSettings();
  if (!data) return null;
  const today = todayISO();
  const { trace, norm, readiness } = loadView(data, today);
  const watched = data.bodyNotes.find((n) => n.kind === 'niggle' && n.area === 'finger' && n.status === 'watching');

  // Chart geometry: 324 × 112 per handoff.
  const W = 324;
  const H = 112;
  const PAD = 6;
  const max = Math.max(1, norm.q3 * 1.4, ...trace.map((t) => t.value));
  const x = (i: number) => PAD + (i / (trace.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);
  const pts = trace.map((t, i) => `${x(i).toFixed(1)},${y(t.value).toFixed(1)}`).join(' ');
  const last = trace[trace.length - 1];

  const days = dailySessionLoad(data.sessions, today, 14);
  const dayMax = Math.max(1, ...days.map((d) => d.load));
  const gym = data.gyms.find((g) => g.id === settings.lastGymId) ?? data.gyms[0];
  const pyramid = gradePyramid(data.sessions, data.problems, today, 8);
  const pyrMax = Math.max(1, ...pyramid.map((r) => r.sends + r.projects));

  return (
    <div className={ui.screen}>
      <div className={ui.header}>
        <span className={ui.title}>Load</span>
      </div>

      <div className={s.readiness}>
        <span className={ui.label}>Readiness · {weekdayShort(today).toUpperCase()} {dayMonth(today)}</span>
        <p className={s.sentence}>
          <span style={{ color: STATE_COLOR[readiness.state] }}>{readiness.verdict}</span> {readiness.reason}
          {readiness.alternative && <span className={s.alt}> {readiness.alternative}</span>}
        </p>
      </div>

      <div className={ui.card}>
        <div className={ui.spread}>
          <span className={ui.label}>Finger load · 4 wk</span>
          <span className={ui.caption}>7-DAY ROLLING</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className={s.chart} role="img" aria-label="Finger load, last 28 days">
          <rect x={0} y={y(norm.q3)} width={W} height={Math.max(1, y(norm.q1) - y(norm.q3))} fill="var(--norm-band)" />
          <polygon points={`${x(0)},${H - PAD} ${pts} ${x(trace.length - 1)},${H - PAD}`} fill="var(--trace-fill)" />
          <polyline points={pts} fill="none" stroke="var(--strawberry)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {watched && <circle cx={x(trace.length - 1)} cy={y(last.value)} r={10} fill="none" stroke="var(--jasmine)" strokeWidth={1.5} />}
          <circle cx={x(trace.length - 1)} cy={y(last.value)} r={5} fill="var(--strawberry)" />
        </svg>
        <div className={s.xLabels}>
          {[0, 7, 14, 21].map((i) => <span key={i}>{dayMonth(trace[i].date)}</span>)}
          <span className={s.todayLabel}>TODAY</span>
        </div>
        {watched && (
          <div className={s.watch}>
            <span className={ui.dot} style={{ background: 'var(--jasmine)' }} />
            {watched.text} · watching since {dayMonthTitle(watched.date)}
          </div>
        )}
      </div>

      <div className={ui.card}>
        <div className={ui.spread}>
          <span className={ui.label}>Session load · 14 d</span>
          <span className={ui.caption}>RPE × MIN</span>
        </div>
        <div className={s.bars}>
          {days.map((d) => (
            <span
              key={d.date}
              className={s.bar}
              title={`${d.date}: ${d.load}`}
              style={
                d.archetype
                  ? { height: `${Math.max(6, (d.load / dayMax) * 100)}%`, background: `var(${ARCHETYPE_INFO[d.archetype].accent})` }
                  : { height: '4%', background: 'var(--line)' }
              }
            />
          ))}
        </div>
      </div>

      <div className={ui.card}>
        <div className={ui.spread}>
          <span className={ui.label}>Grade pyramid · 8 wk</span>
          <span className={ui.caption}>SENDS · PROJECTS</span>
        </div>
        {pyramid.length === 0 && <div className={ui.empty}>No problems logged in the last 8 weeks.</div>}
        {pyramid.map((r) => {
          const band = gym ? bandForGrade(gym, r.grade) : null;
          const color = !band || gym.kind === 'number' || isDark(band.color) ? 'var(--ink-3)' : band.color;
          return (
            <div key={r.grade} className={s.pyrRow}>
              <span className={s.pyrGrade}>{formatGrade(r.grade, settings.gradeDisplay)}</span>
              <span className={s.pyrTrack}>
                <span style={{ width: `${(r.sends / pyrMax) * 100}%`, background: color }} className={s.pyrSend} />
                <span style={{ width: `${(r.projects / pyrMax) * 100}%`, boxShadow: `inset 0 0 0 1.5px ${color}` }} className={s.pyrProj} />
              </span>
              <span className={s.pyrCount}>{r.sends} · {r.projects}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

