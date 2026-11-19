// The file as stored, for a key that does not come from a passphrase
// (docs/sync.md#the-sealed-file-version-2): no salt and no iteration count,
// and additional data that ties the file to its place. No cryptography and no
// base64 coding here.

import { COLLECTION_NAME, base64, isObj, text } from './frame';
import { ENVELOPE_FORMAT, type EnvelopeError } from './envelope';

/** The version of the sealed file this package reads and writes. */
export const SEALED_VERSION = 2;

export interface Sealed {
  format: 'materia-sync';
  version: 2;
  cipher: { name: string; nonce: string };
  data: string;
}

export type SealedError = EnvelopeError;

/**
 * Parses and validates the stored text; unknown fields are ignored. Version 1
 * is `invalid` here: a caller that wants to read it uses `parseEnvelope`.
 * @param json The text of the stored file.
 * @returns The sealed file, or the first problem found.
 */
export function parseSealed(
  json: string,
): { ok: true; sealed: Sealed } | { ok: false; error: SealedError } {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'not-json' };
  }
  if (!isObj(raw) || raw.format !== ENVELOPE_FORMAT) return { ok: false, error: 'not-an-envelope' };
  if (typeof raw.version === 'number' && raw.version > SEALED_VERSION) {
    return { ok: false, error: 'newer-version' };
  }
  const { cipher } = raw;
  if (
    raw.version !== SEALED_VERSION ||
    !isObj(cipher) ||
    !text(cipher.name) ||
    !base64(cipher.nonce) ||
    !base64(raw.data)
  ) {
    return { ok: false, error: 'invalid' };
  }
  return {
    ok: true,
    sealed: {
      format: ENVELOPE_FORMAT,
      version: SEALED_VERSION,
      cipher: { name: cipher.name, nonce: cipher.nonce },
      data: raw.data,
    },
  };
}

/**
 * Writes the stable text of a sealed file, fields in a fixed order.
 * @param sealed The sealed file.
 * @returns The compact JSON text.
 */
export function buildSealed(sealed: Sealed): string {
  return JSON.stringify({
    format: ENVELOPE_FORMAT,
    version: SEALED_VERSION,
    cipher: { name: sealed.cipher.name, nonce: sealed.cipher.nonce },
    data: sealed.data,
  });
}

/**
 * Gives the additional data the cipher binds to the ciphertext, so one file
 * cannot be put in place of another: `materia-sync/2/<space>/<collection>`.
 * @param space The space id.
 * @param collection The collection name.
 * @returns The text, or undefined when the space is empty or the collection name breaks the name rule.
 */
export function sealedAad(space: string, collection: string): string | undefined {
  if (!text(space) || typeof collection !== 'string' || !COLLECTION_NAME.test(collection)) {
    return undefined;
  }
  return `${ENVELOPE_FORMAT}/${SEALED_VERSION}/${space}/${collection}`;
}
