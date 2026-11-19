// Reading and writing the one encrypted file of a place through the adapter
// and the cipher; never throws. Docs: docs/sync-cycle.md#one-attempt.

import {
  buildDocument,
  buildEnvelope,
  parseDocument,
  parseEnvelope,
  type Cipher,
  type Envelope,
  type PlaceDocument,
  type StorageAdapter,
} from '@mixtura/engine';
import type { Ingredient } from '../store';
import { UnsupportedEnvelope, WrongPassphrase } from '@nexumia-de/hospes';
import type { SyncFailure } from './outcome';
import type { StockValue } from './records';

export type Document = PlaceDocument<StockValue, Ingredient>;

export type FileRead =
  | { ok: true; missing: true }
  | { ok: true; missing: false; document: Document; etag: string; envelope: Envelope }
  | ({ ok: false } & SyncFailure);

const message = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Reads, parses and decrypts the file. A wrong passphrase or an unreadable file is a failure. */
export async function readPlaceFile(
  adapter: StorageAdapter,
  cipher: Cipher,
  path: string,
  passphrase: string,
): Promise<FileRead> {
  const fail = (f: Omit<SyncFailure, 'kind'>): FileRead => ({ ok: false, kind: 'failed', ...f });
  let read;
  try {
    read = await adapter.read(path);
  } catch (error) {
    return fail({ reason: 'unreachable', detail: message(error) });
  }
  if (!read.ok) return fail({ reason: read.failure, detail: read.detail });
  if (read.missing) return { ok: true, missing: true };
  const parsed = parseEnvelope(read.body);
  if (!parsed.ok) return fail({ reason: 'unsupported-file', code: parsed.error });
  let plain: string;
  try {
    plain = await cipher.open(parsed.envelope, passphrase);
  } catch (error) {
    if (error instanceof WrongPassphrase) return fail({ reason: 'wrong-passphrase' });
    if (error instanceof UnsupportedEnvelope)
      return fail({
        reason: 'unsupported-file',
        code: 'unsupported-scheme',
        detail: message(error),
      });
    return fail({ reason: 'internal', detail: message(error) });
  }
  const doc = parseDocument(plain);
  if (!doc.ok) return fail({ reason: 'unsupported-file', code: doc.error });
  return {
    ok: true,
    missing: false,
    document: doc.document as Document,
    etag: read.etag,
    envelope: parsed.envelope,
  };
}

/** Seals and writes a document: `ifMatch` an etag, or null for "must not exist". */
export async function writePlaceFile(
  adapter: StorageAdapter,
  cipher: Cipher,
  path: string,
  passphrase: string,
  document: Document,
  ifMatch: string | null,
  previous?: Envelope,
): Promise<{ ok: true; etag?: string | undefined } | ({ ok: false } & SyncFailure)> {
  let body: string;
  try {
    const envelope = await cipher.seal(buildDocument(document), passphrase, previous);
    body = buildEnvelope(envelope);
  } catch (error) {
    return { ok: false, kind: 'failed', reason: 'internal', detail: message(error) };
  }
  try {
    const result = await adapter.write(path, body, ifMatch);
    if (result.ok) return { ok: true, etag: result.etag };
    return { ok: false, kind: 'failed', reason: result.failure, detail: result.detail };
  } catch (error) {
    return { ok: false, kind: 'failed', reason: 'unreachable', detail: message(error) };
  }
}
