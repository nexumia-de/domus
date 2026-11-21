// Reads an export file: version first, older versions migrated step by step, then every record
// validated against its schema. Nothing is returned for a file that does not pass, so the host
// can refuse it before touching stored data.
import { EXPORT_FORMAT, EXPORT_VERSION } from './build';
import {
  EXPORT_KINDS,
  KIND_SINCE,
  type ExportError,
  type ExportKind,
  type ExportMigration,
  type FullRecordSets,
  type ParseResult,
  type RecordValidators,
} from './types';

/** The version from which a file holds no stock (docs/exchange.md#versions). */
const WITHOUT_STOCK = 2;

/**
 * The migrations from older export versions. 1 -> 2 leaves `stock` out: stock is the shared
 * collection of a space since version 2, and a replace import must not delete what another app
 * or person put there.
 */
export const EXPORT_MIGRATIONS: readonly ExportMigration[] = [
  {
    from: 1,
    to: 2,
    migrate: (file) => {
      const out = { ...file };
      delete out.stock;
      return out;
    },
  },
  // 2 -> 3 adds the collection `skills`; a file of version 2 has none, so nothing changes.
  { from: 2, to: 3, migrate: (file) => file },
];

export interface ParseOptions {
  /** Test hook: the newest version this reader knows (default `EXPORT_VERSION`). */
  current?: number;
  /** Test hook: replaces the real migration list. */
  migrations?: readonly ExportMigration[];
}

const fail = (error: ExportError): { ok: false; error: ExportError } => ({ ok: false, error });
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HEADER_FIELDS = new Set<string>(['format', 'formatVersion', 'seedVersion', 'exportedAt']);
const INSTANT = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?Z$/;

/** The version of a parsed file, or the error that says why it has none. */
const versionOf = (file: Record<string, unknown>, current: number): number | ParseResult => {
  if (file.format !== EXPORT_FORMAT) return fail({ code: 'not-an-export' });
  const version = file.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail({ code: 'bad-version' });
  }
  if (version > current) return fail({ code: 'newer-version', found: version, supported: current });
  return version;
};

const migrated = (
  file: Record<string, unknown>,
  from: number,
  current: number,
  migrations: readonly ExportMigration[],
): { file: Record<string, unknown> } | { ok: false; error: ExportError } => {
  let out = file;
  for (let v = from; v < current; v++) {
    const step = migrations.find((m) => m.from === v && m.to === v + 1);
    if (step === undefined) return fail({ code: 'bad-migration', found: v, supported: current });
    try {
      out = { ...step.migrate(structuredClone(out)), formatVersion: v + 1 };
    } catch {
      return fail({ code: 'bad-migration', found: v, supported: current });
    }
  }
  return { file: out };
};

/**
 * Reads the text of an export file.
 *
 * @param text - The file's content.
 * @param validators - One compiled schema validator per kind.
 * @returns The records per kind, or the first problem: `not-json`, `not-an-export`,
 *   `bad-version`, `newer-version` (with `found` and `supported`), `unknown-field`,
 *   `not-a-list`, `invalid-record` (kind, index, schema paths) or `duplicate-id`.
 */
export function parseExport(
  text: string,
  validators: RecordValidators,
  options: ParseOptions = {},
): ParseResult {
  const current = options.current ?? EXPORT_VERSION;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fail({ code: 'not-json' });
  }
  if (!isObject(parsed)) return fail({ code: 'not-an-export' });
  const version = versionOf(parsed, current);
  if (typeof version !== 'number') return version;
  // Counted before the chain runs, so the host can say that the file's stock was left out.
  const stock = parsed.stock;
  const stockLeftOut =
    options.migrations === undefined &&
    version < WITHOUT_STOCK &&
    current >= WITHOUT_STOCK &&
    Array.isArray(stock)
      ? stock.length
      : 0;
  const done = migrated(parsed, version, current, options.migrations ?? EXPORT_MIGRATIONS);
  if ('error' in done) return done;
  const { file } = done;

  // A kind the file's own version did not have is a field it cannot hold (skills in version 2).
  const heldBy = (field: string): boolean =>
    EXPORT_KINDS.some((k) => k === field && (KIND_SINCE[k] ?? 1) <= version);
  for (const field of Object.keys(file)) {
    const known = HEADER_FIELDS.has(field) || field.startsWith('x-') || heldBy(field);
    if (!known) return fail({ code: 'unknown-field', field });
  }
  const { seedVersion, exportedAt } = file;
  if (seedVersion !== undefined && (typeof seedVersion !== 'string' || seedVersion === '')) {
    return fail({ code: 'unknown-field', field: 'seedVersion' });
  }
  if (exportedAt !== undefined && (typeof exportedAt !== 'string' || !INSTANT.test(exportedAt))) {
    return fail({ code: 'unknown-field', field: 'exportedAt' });
  }

  const records = Object.fromEntries(EXPORT_KINDS.map((k) => [k, []])) as unknown as FullRecordSets;
  for (const kind of EXPORT_KINDS) {
    const list = file[kind];
    if (list === undefined) continue;
    if (!Array.isArray(list)) return fail({ code: 'not-a-list', kind });
    const seen = new Set<string>();
    for (const [index, record] of list.entries()) {
      const check = validators[kind];
      if (!check(record) || !isObject(record) || typeof record.id !== 'string') {
        const issues = (check.errors ?? []).map((e) => ({
          path: e.instancePath === '' ? '/' : e.instancePath,
          keyword: e.keyword,
        }));
        return fail({ code: 'invalid-record', kind, index, issues });
      }
      if (seen.has(record.id)) return fail({ code: 'duplicate-id', kind, index, id: record.id });
      seen.add(record.id);
      records[kind].push(record as FullRecordSets[ExportKind][number]);
    }
  }
  return {
    ok: true,
    content: {
      formatVersion: current,
      fileVersion: version,
      ...(typeof seedVersion === 'string' ? { seedVersion } : {}),
      ...(typeof exportedAt === 'string' ? { exportedAt } : {}),
      records,
      ...(stockLeftOut > 0 ? { stockLeftOut } : {}),
    },
  };
}
