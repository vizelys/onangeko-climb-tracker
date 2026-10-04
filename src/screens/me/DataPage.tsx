import { useRef, useState } from 'react';
import { db } from '../../db/db';
import { exportAll, importAll, parseExport } from '../../db/exportImport';
import { todayISO } from '../../domain/dates';
import ui from '../../ui/ui.module.css';
import { Page } from './Page';

/** The data is yours and leaves easily (SPEC §2.6). */
export function DataPage({ onBack }: { onBack: () => void }) {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function doExport() {
    const doc = await exportAll(db);
    const name = `climbing-tracker-${todayISO()}.json`;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const f = new File([blob], name, { type: 'application/json' });
    if (navigator.canShare?.({ files: [f] })) {
      try {
        await navigator.share({ files: [f], title: name });
        return;
      } catch {
        // Cancelled share sheet: fall through to a download.
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(f: File) {
    try {
      const doc = parseExport(await f.text());
      const n = Object.values(doc.tables).reduce((a, t) => a + t.length, 0);
      if (!window.confirm(`Replace everything on this phone with ${n} rows from ${doc.exportedAt.slice(0, 10) || 'the file'}?`)) return;
      await importAll(db, doc);
      setMsg('✓ Imported');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed');
    }
  }

  return (
    <Page title="Export / import" onBack={onBack}>
      <div className={ui.card}>
        <div className={ui.body2}>One JSON file with everything. Importing replaces all data on this phone.</div>
        <button className={ui.btnPrimary} onClick={() => void doExport()}>Export JSON</button>
        <button className={ui.btnOutline} onClick={() => file.current?.click()}>Import JSON…</button>
        <input
          ref={file}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) void doImport(f);
          }}
        />
        {msg && <div style={{ color: msg.startsWith('✓') ? 'var(--mint)' : 'var(--ink-2)', fontWeight: 600 }}>{msg}</div>}
      </div>
    </Page>
  );
}
