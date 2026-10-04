import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import s from './App.module.css';
import { db } from './db/db';
import type { Archetype } from './db/types';
import { LimitForm } from './forms/LimitForm';
import { SessionForm } from './forms/SessionForm';
import { LoadScreen } from './screens/LoadScreen';
import { LogScreen } from './screens/LogScreen';
import { MeScreen } from './screens/MeScreen';
import { TestsScreen } from './screens/TestsScreen';
import { TodayScreen } from './screens/TodayScreen';

const TABS = [
  ['today', 'Today'],
  ['log', 'Log'],
  ['load', 'Load'],
  ['tests', 'Tests'],
  ['me', 'Me'],
] as const;
type Tab = (typeof TABS)[number][0];

/** What a screen can ask the shell to open. */
export type OpenForm =
  | { kind: 'new'; archetype: Archetype }
  | { kind: 'edit'; sessionId: string };

export function App() {
  const [tab, setTab] = useState<Tab>('today');
  const [form, setForm] = useState<OpenForm | null>(null);

  // A live (unfinished) limit session always takes the screen, even after a reload.
  const live = useLiveQuery(() => db.sessions.filter((x) => x.duration === undefined).first(), []);
  const editSession = useLiveQuery(
    () => (form?.kind === 'edit' ? db.sessions.get(form.sessionId) : undefined),
    [form],
  );

  if (live) return <LimitForm session={live} onClose={() => undefined} />;
  if (form?.kind === 'new' && form.archetype !== 'limit') {
    return <SessionForm archetype={form.archetype} onClose={() => setForm(null)} />;
  }
  if (form?.kind === 'edit' && editSession) {
    if (editSession.archetype === 'limit') {
      return <LimitForm session={editSession} onClose={() => setForm(null)} />;
    }
    return <SessionForm archetype={editSession.archetype} existing={editSession} onClose={() => setForm(null)} />;
  }

  return (
    <div className={s.app}>
      <main className={s.main}>
        {tab === 'today' && <TodayScreen open={setForm} />}
        {tab === 'log' && <LogScreen open={setForm} />}
        {tab === 'load' && <LoadScreen />}
        {tab === 'tests' && <TestsScreen />}
        {tab === 'me' && <MeScreen open={setForm} />}
      </main>
      <nav className={s.tabs}>
        {TABS.map(([id, label]) => (
          <button key={id} className={`${s.tab} ${tab === id ? s.active : ''}`} onClick={() => setTab(id)}>
            <span className={s.bar} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
