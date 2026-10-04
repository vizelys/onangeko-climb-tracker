import { TABLE_NAMES, type TableName, type TrackerDB } from './db';

export const EXPORT_FORMAT = 'climbing-tracker';
export const EXPORT_VERSION = 1;

export interface ExportDocument {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  tables: Record<TableName, unknown[]>;
}

export async function exportAll(db: TrackerDB): Promise<ExportDocument> {
  const tables = {} as Record<TableName, unknown[]>;
  await db.transaction('r', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      tables[name] = await db.table(name).toArray();
    }
  });
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    tables,
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Throws with a readable message when the file is not one of ours. */
export function parseExport(text: string): ExportDocument {
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw) || raw.format !== EXPORT_FORMAT) {
    throw new Error('Not a climbing-tracker export');
  }
  if (typeof raw.version !== 'number' || raw.version > EXPORT_VERSION) {
    throw new Error(`Unsupported export version: ${String(raw.version)}`);
  }
  const tablesRaw = raw.tables;
  if (!isRecord(tablesRaw)) throw new Error('Export has no tables');
  const tables = {} as Record<TableName, unknown[]>;
  for (const name of TABLE_NAMES) {
    const rows = tablesRaw[name];
    tables[name] = Array.isArray(rows) ? rows : [];
  }
  return {
    format: EXPORT_FORMAT,
    version: raw.version,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : '',
    tables,
  };
}

/** Replaces everything. All-or-nothing: a failed import leaves the old data. */
export async function importAll(db: TrackerDB, doc: ExportDocument): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name);
      await table.clear();
      await table.bulkAdd(doc.tables[name]);
    }
  });
}
