// Reads an export file the user chose. The file is untrusted input: size
// limit, no keys that could reach the prototype, version check, migration of
// older formats, the current JSON Schema, and the id rule for user ids. The
// result is complete or a named refusal; nothing here touches the database.

import { findFamilyCycles } from '@mixtura/engine';
import { isUserId } from '../ids';
import { exportProblems } from '../validate';
import { APP_TAG, FORMAT_VERSION, MAX_FILE_BYTES, type ExportFile } from './format';
import { migrateFile, type FormatMigration, formatMigrations } from './migrate';

export type ParseFailure =
  /** Larger than the limit. */
  | { kind: 'too-large'; bytes: number; limit: number }
  /** Not JSON, or JSON that cannot be an export (not an object, forbidden keys). */
  | { kind: 'unreadable'; reason: string }
  /** JSON, but not made by this app. */
  | { kind: 'not-mixtura' }
  /** A format version above the one this app reads. */
  | { kind: 'newer'; found: number; supported: number }
  /** Schema or id problems, one line each. */
  | { kind: 'invalid'; problems: string[] };

export type ParseResult =
  | { ok: true; file: ExportFile; migratedFrom: number | null }
  | { ok: false; failure: ParseFailure };

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function forbiddenKeyReviver(key: string, value: unknown): unknown {
  if (FORBIDDEN_KEYS.has(key)) throw new Error(`the key "${key}" is not allowed`);
  return value;
}

const fail = (failure: ParseFailure): ParseResult => ({ ok: false, failure });

/** Ids that must be user ids (`u-<uuid>`): everything but the key of a stock record. */
export function idProblems(file: ExportFile): string[] {
  const problems: string[] = [];
  const check = (path: string, id: unknown): void => {
    if (typeof id !== 'string' || !isUserId(id)) problems.push(`${path} is not a user id`);
  };
  file.ingredients.forEach((r, i) => check(`/ingredients/${i}/id`, r.id));
  file.templates.forEach((r, i) => check(`/templates/${i}/id`, r.id));
  file.affinities.forEach((r, i) => check(`/affinities/${i}/id`, r.id));
  file.specs.forEach((r, i) => {
    check(`/specs/${i}/id`, r.id);
    check(`/specs/${i}/lineageId`, r.lineageId);
  });
  return problems;
}

/** Duplicates inside one file would make "add" ambiguous. */
export function duplicateProblems(file: ExportFile): string[] {
  const problems: string[] = [];
  const dupes = (path: string, keys: string[]): void => {
    const seen = new Set<string>();
    keys.forEach((key, i) => {
      if (seen.has(key)) problems.push(`${path}/${i} repeats an earlier record`);
      seen.add(key);
    });
  };
  dupes(
    '/ingredients',
    file.ingredients.map((r) => r.id),
  );
  dupes(
    '/templates',
    file.templates.map((r) => r.id),
  );
  dupes(
    '/affinities',
    file.affinities.map((r) => r.id),
  );
  dupes(
    '/stock',
    file.stock.map((r) => r.ingredientId),
  );
  dupes(
    '/specs',
    file.specs.map((r) => r.id),
  );
  dupes(
    '/specs',
    file.specs.map((r) => `${r.lineageId}#${r.version}`),
  );
  return problems;
}

/** Riffs that are their own ancestors: refused, naming the drinks (the app itself never makes one). */
export function cycleProblems(file: ExportFile): string[] {
  const specs = file.specs.map((s) => ({
    id: s.id,
    lineageId: s.lineageId,
    version: s.version,
    ...(typeof s.parentId === 'string' && { parentId: s.parentId }),
  }));
  const name = (lineageId: string): string =>
    String(file.specs.find((s) => s.lineageId === lineageId)?.name ?? lineageId);
  return findFamilyCycles(specs).map(
    (loop) =>
      `/specs: these drinks are riffs of each other in a loop: ${loop.map(name).join(', ')}`,
  );
}

export interface ParseOptions {
  limit?: number;
  migrations?: readonly FormatMigration[];
  currentVersion?: number;
}

/** `bytes` is the size reported by the browser for the file, checked before and after reading. */
export function parseExportFile(
  text: string,
  bytes: number,
  options: ParseOptions = {},
): ParseResult {
  const limit = options.limit ?? MAX_FILE_BYTES;
  const supported = options.currentVersion ?? FORMAT_VERSION;
  const size = Math.max(bytes, text.length);
  if (size > limit) return fail({ kind: 'too-large', bytes: size, limit });

  let raw: unknown;
  try {
    raw = JSON.parse(text, forbiddenKeyReviver);
  } catch (error) {
    return fail({ kind: 'unreadable', reason: error instanceof Error ? error.message : 'invalid' });
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fail({ kind: 'not-mixtura' });
  let file = raw as Record<string, unknown>;
  if (file['app'] !== APP_TAG) return fail({ kind: 'not-mixtura' });

  const version = file['formatVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return fail({ kind: 'invalid', problems: ['/formatVersion must be a whole number from 1'] });
  }
  if (version > supported) return fail({ kind: 'newer', found: version, supported });

  let migratedFrom: number | null = null;
  if (version < supported) {
    try {
      file = migrateFile(file, version, supported, options.migrations ?? formatMigrations);
      migratedFrom = version;
    } catch (error) {
      return fail({
        kind: 'unreadable',
        reason: error instanceof Error ? error.message : 'invalid',
      });
    }
  }

  const problems = exportProblems(file);
  if (problems.length > 0) return fail({ kind: 'invalid', problems });
  const typed = file as unknown as ExportFile;
  const more = [...idProblems(typed), ...duplicateProblems(typed), ...cycleProblems(typed)];
  if (more.length > 0) return fail({ kind: 'invalid', problems: more.slice(0, 20) });
  return { ok: true, file: typed, migratedFrom };
}
