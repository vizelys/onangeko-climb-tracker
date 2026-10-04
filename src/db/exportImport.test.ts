import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { TrackerDB } from './db';
import { exportAll, importAll, parseExport } from './exportImport';

let n = 0;
const dbs: TrackerDB[] = [];
function freshDb(): TrackerDB {
  const d = new TrackerDB(`test-${n++}`);
  dbs.push(d);
  return d;
}

afterEach(async () => {
  for (const d of dbs.splice(0)) await d.delete();
});

async function seed(d: TrackerDB) {
  await d.sessions.add({ id: 's1', date: '2026-10-03', archetype: 'limit', startedAt: 1, duration: 75, rpe: 8, gymId: 'arkose' });
  await d.problems.add({ id: 'p1', sessionId: 's1', gradeCanonical: '6B+', gradeAsEntered: 'Rouge', attempts: 3, outcome: 'send', loggedAt: 2 });
  await d.habitTicks.add({ date: '2026-10-03', habit: 'mind', done: true, durationSec: 600 });
  await d.meals.add({ id: 'm1', date: '2026-10-03', slot: 'lunch', components: ['rice', 'tofu'], size: 'normal', estimate: { low: 600, high: 800 }, estimateSource: 'manual' });
  await d.settings.add({ key: 'gradeDisplay', value: 'V' });
}

describe('persistence', () => {
  it('a logged problem survives reopening the database', async () => {
    const a = freshDb();
    await seed(a);
    a.close();
    const b = new TrackerDB(a.name);
    dbs.push(b);
    const p = await b.problems.get('p1');
    expect(p?.gradeCanonical).toBe('6B+');
    expect(p?.gradeAsEntered).toBe('Rouge');
  });

  it('export re-imports to identical state', async () => {
    const a = freshDb();
    await seed(a);
    const doc = await exportAll(a);
    const text = JSON.stringify(doc);

    const b = freshDb();
    await b.sessions.add({ id: 'stale', date: '2020-01-01', archetype: 'run', startedAt: 0 });
    await importAll(b, parseExport(text));
    const again = await exportAll(b);
    expect(again.tables).toEqual(doc.tables);
  });

  it('rejects a file that is not an export', () => {
    expect(() => parseExport('{"hello":1}')).toThrow(/Not a climbing-tracker export/);
  });

  it('a failed import leaves existing data alone', async () => {
    const a = freshDb();
    await seed(a);
    const doc = await exportAll(a);
    // Duplicate primary key makes bulkAdd fail mid-transaction.
    doc.tables.sessions = [doc.tables.sessions[0], doc.tables.sessions[0]];
    await expect(importAll(a, doc)).rejects.toBeTruthy();
    expect(await a.problems.count()).toBe(1);
  });
});
