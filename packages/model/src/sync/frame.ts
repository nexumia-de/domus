// The small pieces the document files share: checks of a parsed frame and
// the stable text of a record list (docs/sync.md#the-collection-document).

import { compareText, sortedValue } from './canonical';
import type { SyncRecord } from './records';

/** A parsed JSON object with unknown members. */
export type Obj = Record<string, unknown>;

/**
 * Tells whether a parsed value is a plain object (not null, not an array).
 * @param x The parsed value.
 * @returns True for a plain object.
 */
export const isObj = (x: unknown): x is Obj =>
  x !== null && typeof x === 'object' && !Array.isArray(x);

/**
 * Tells whether a parsed value is a non-empty string.
 * @param x The parsed value.
 * @returns True for a non-empty string.
 */
export const text = (x: unknown): x is string => typeof x === 'string' && x !== '';

/** The rule for a collection name, shared by the collection document and the sealed file. */
export const COLLECTION_NAME = /^[a-z][a-z0-9-]*$/;

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/**
 * Tells whether a parsed value is non-empty base64 text.
 * @param x The parsed value.
 * @returns True for a string of the base64 alphabet with at most two `=` at the end.
 */
export const base64 = (x: unknown): x is string => typeof x === 'string' && BASE64.test(x);

/**
 * Tells whether a parsed value is an array of plain objects.
 * @param x The parsed value.
 * @returns True for an array whose members are all plain objects.
 */
export const objects = (x: unknown): x is Obj[] => Array.isArray(x) && x.every(isObj);

const clean = (r: SyncRecord): unknown => ({
  key: r.key,
  updatedAt: r.updatedAt,
  ...(r.deleted === true ? { deleted: true } : {}),
  ...(r.value === undefined ? {} : { value: sortedValue(r.value) }),
});

/**
 * Puts records into the stable form of a document.
 * @param list The records of a document.
 * @returns Copies sorted by key, with fixed field order and sorted value keys.
 */
export const recordsByKey = (list: readonly SyncRecord[]): unknown[] =>
  [...list].sort((a, b) => compareText(String(a.key), String(b.key))).map(clean);
