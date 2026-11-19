// The share link: `<app address>#/share/<payload>`, the payload being `1.` and the
// base64url of the deflate-raw compressed UTF-8 text of a share file
// (docs/export-format.md#share-link). The platform's streams do the
// compression; no dependency. Reading is untrusted input: the decompressed
// size is capped while reading, so a small payload cannot grow without end.

import { MAX_FILE_BYTES } from '../store';
import { base64ToBytes, bytesToBase64 } from '@nexumia-de/hospes';

/** The first part of a payload; a payload with another version is refused. */
export const LINK_VERSION = '1';
/** Longest link made; longer ones go through Export (chat apps cut or break long links). */
export const MAX_LINK_LENGTH = 8000;

export type DecodeFailure =
  /** Not a payload of this form (wrong alphabet, no version, empty). */
  | 'damaged'
  /** A link version this app does not know. */
  | 'version'
  /** The text would be larger than a file import reads. */
  | 'too-large';

export type Decoded = { ok: true; text: string } | { ok: false; reason: DecodeFailure };

const toUrlSafe = (base64: string): string =>
  base64.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');

const fromUrlSafe = (text: string): string | undefined => {
  if (!/^[A-Za-z0-9_-]+$/.test(text) || text.length % 4 === 1) return undefined;
  const standard = text.replaceAll('-', '+').replaceAll('_', '/');
  return standard + '='.repeat((4 - (standard.length % 4)) % 4);
};

async function collect(
  stream: ReadableStream<Uint8Array>,
  limit: number,
): Promise<Uint8Array[] | null> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return chunks;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
}

const join = (chunks: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.length;
  }
  return out;
};

/**
 * The payload of a link for a text.
 * @param text The share file as JSON.
 * @returns `1.` and the compressed text in base64url.
 */
export async function encodePayload(text: string): Promise<string> {
  const packed = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const chunks = await collect(packed, Number.POSITIVE_INFINITY);
  return `${LINK_VERSION}.${toUrlSafe(bytesToBase64(join(chunks ?? [])))}`;
}

/**
 * Reads a payload back to its text.
 * @param payload What follows `#/share/`.
 * @param limit Largest decompressed size read, in bytes; the import's file size limit by default.
 * @returns The text, or the named reason the payload is refused.
 */
export async function decodePayload(payload: string, limit = MAX_FILE_BYTES): Promise<Decoded> {
  const dot = payload.indexOf('.');
  if (dot < 1) return { ok: false, reason: 'damaged' };
  if (payload.slice(0, dot) !== LINK_VERSION) return { ok: false, reason: 'version' };
  const base64 = fromUrlSafe(payload.slice(dot + 1));
  const bytes = base64 === undefined ? undefined : base64ToBytes(base64);
  if (!bytes) return { ok: false, reason: 'damaged' };
  try {
    const stream = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream('deflate-raw'));
    const chunks = await collect(stream, limit);
    if (!chunks) return { ok: false, reason: 'too-large' };
    return { ok: true, text: new TextDecoder('utf-8', { fatal: true }).decode(join(chunks)) };
  } catch {
    return { ok: false, reason: 'damaged' };
  }
}

export type LinkResult =
  { ok: true; url: string } | { ok: false; reason: 'too-long'; length: number };

/**
 * The link for a share file text.
 * @param text The share file as JSON.
 * @param address The app's address without the hash (origin and base path).
 * @returns The link, or `too-long` when it would be over `MAX_LINK_LENGTH` characters.
 */
export async function makeLink(text: string, address: string): Promise<LinkResult> {
  const url = `${address}#/share/${await encodePayload(text)}`;
  return url.length > MAX_LINK_LENGTH
    ? { ok: false, reason: 'too-long', length: url.length }
    : { ok: true, url };
}
