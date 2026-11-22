// The document of one collection of a space: the thing that gets encrypted
// (docs/sync.md#the-collection-document). Parsing checks the frame; whether a
// single record is valid is decided by the merge, which reports it as rejected.

import { COLLECTION_NAME, isObj, objects, recordsByKey, text } from './frame';
import { instantMs } from './instant';
import type { SyncRecord } from './records';

/** The format name of a collection document. */
export const COLLECTION_FORMAT = 'materia-collection';
/** The version of the collection document this package reads and writes. */
export const COLLECTION_VERSION = 1;

export interface CollectionDocument<V = unknown> {
  format: 'materia-collection';
  version: 1;
  /** The id of the space the file belongs to. */
  space: string;
  /** The collection name; matches `/^[a-z][a-z0-9-]*$/`. */
  collection: string;
  records: SyncRecord<V>[];
  /** Removal markers older than this were dropped from this file. */
  prunedBefore?: string;
}

export type CollectionError = 'not-json' | 'not-a-collection' | 'newer-version' | 'invalid';

/**
 * Parses the plain text of a collection; unknown top-level fields are ignored.
 * @param json The decrypted text.
 * @returns The document, or the first problem: not JSON, not a collection
 * document, a newer version, or a broken frame.
 */
export function parseCollection(
  json: string,
): { ok: true; collection: CollectionDocument } | { ok: false; error: CollectionError } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (!isObj(raw) || raw.format !== COLLECTION_FORMAT) {
    return { ok: false, error: 'not-a-collection' };
  }
  if (typeof raw.version === 'number' && raw.version > COLLECTION_VERSION) {
    return { ok: false, error: 'newer-version' };
  }
  if (
    raw.version !== COLLECTION_VERSION ||
    !text(raw.space) ||
    typeof raw.collection !== 'string' ||
    !COLLECTION_NAME.test(raw.collection) ||
    !objects(raw.records) ||
    (raw.prunedBefore !== undefined && instantMs(raw.prunedBefore) === undefined)
  ) {
    return { ok: false, error: 'invalid' };
  }
  const doc: CollectionDocument = {
    format: COLLECTION_FORMAT,
    version: COLLECTION_VERSION,
    space: raw.space,
    collection: raw.collection,
    records: raw.records as unknown as SyncRecord[],
  };
  if (raw.prunedBefore !== undefined) doc.prunedBefore = raw.prunedBefore as string;
  return { ok: true, collection: doc };
}

/**
 * Writes the stable text of a collection: fixed key order, records sorted by
 * key, values with sorted keys, `prunedBefore` only when there is one. Equal
 * content gives equal text.
 * @param collection The collection document.
 * @returns The compact JSON text.
 */
export function buildCollection(collection: CollectionDocument): string {
  return JSON.stringify({
    format: COLLECTION_FORMAT,
    version: COLLECTION_VERSION,
    space: collection.space,
    collection: collection.collection,
    records: recordsByKey(collection.records),
    ...(collection.prunedBefore === undefined ? {} : { prunedBefore: collection.prunedBefore }),
  });
}
