// The file as stored (docs/sync.md#the-sealed-file-version-2): ciphertext,
// the nonce, and additional data that ties the file to its space and
// collection. No cryptography and no base64 coding here.

import { COLLECTION_NAME, base64, isObj, text } from './frame';

/** The format name of a sealed file. */
export const SEALED_FORMAT = 'materia-sync';
/** The version of the sealed file this package reads and writes. */
export const SEALED_VERSION = 2;

export interface Sealed {
  format: 'materia-sync';
  version: 2;
  cipher: { name: string; nonce: string };
  data: string;
}

export type SealedError = 'not-json' | 'not-an-envelope' | 'newer-version' | 'invalid';

/**
 * Parses and validates the stored text; unknown fields are ignored. Version 1
 * (the passphrase envelope, removed) is `invalid`.
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
  if (!isObj(raw) || raw.format !== SEALED_FORMAT) return { ok: false, error: 'not-an-envelope' };
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
      format: SEALED_FORMAT,
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
    format: SEALED_FORMAT,
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
  return `${SEALED_FORMAT}/${SEALED_VERSION}/${space}/${collection}`;
}
