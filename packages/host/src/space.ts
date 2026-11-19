// A space's secret and what is derived from it, on Web Crypto only. The
// secret is random (not chosen by a person), so HKDF is enough and no slow
// key stretching is needed. See docs/spaces.md.
import { base64UrlToBytes, bytesToBase64Url } from './base64url';

/** The three labels; the version suffix lets a later scheme derive other values. */
export const SPACE_LABELS = {
  id: 'domus/space/id/1',
  content: 'domus/space/content/1',
  access: 'domus/space/access/1',
} as const;

/** Source of random bytes; tests pass a fixed one. */
export type RandomBytes = (length: number) => Uint8Array;

const defaultRandom: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));
const encoder = new TextEncoder();
const buffer = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

/** The secret is not 32 bytes in base64url (43 characters). */
export class BadSecret extends Error {
  constructor() {
    super('The secret must be 43 base64url characters (32 bytes)');
    this.name = 'BadSecret';
  }
}

/** What a space is for the code: its id, the content key and the server's access token. */
export interface Space {
  /** 16 bytes as lowercase hex (32 characters); names the folder in a storage. */
  id: string;
  /** AES-256-GCM key for the files; cannot be exported. */
  key: CryptoKey;
  /** 32 bytes as base64url; what a sync server checks. It reveals nothing of the secret or the key. */
  access: string;
}

/**
 * Makes a new secret: 32 random bytes as base64url without padding.
 * @param random Source of random bytes; defaults to `crypto.getRandomValues`.
 * @returns 43 characters, the form an invite carries.
 */
export function newSecret(random: RandomBytes = defaultRandom): string {
  return bytesToBase64Url(random(32));
}

/**
 * Derives id, content key and access token from a secret with HKDF-SHA-256
 * (empty salt, one label each).
 * @param secret The space's secret, 43 base64url characters.
 * @returns The space.
 * @throws BadSecret when the secret is not 43 base64url characters.
 */
export async function deriveSpace(secret: string): Promise<Space> {
  const bytes = /^[A-Za-z0-9_-]{43}$/.test(secret) ? base64UrlToBytes(secret) : undefined;
  if (bytes?.length !== 32) throw new BadSecret();
  const material = await crypto.subtle.importKey('raw', buffer(bytes), 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ]);
  const params = (label: string): HkdfParams => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: new ArrayBuffer(0),
    info: buffer(encoder.encode(label)),
  });
  const id = new Uint8Array(await crypto.subtle.deriveBits(params(SPACE_LABELS.id), material, 128));
  const access = new Uint8Array(
    await crypto.subtle.deriveBits(params(SPACE_LABELS.access), material, 256),
  );
  const key = await crypto.subtle.deriveKey(
    params(SPACE_LABELS.content),
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return {
    id: Array.from(id, (b) => b.toString(16).padStart(2, '0')).join(''),
    key,
    access: bytesToBase64Url(access),
  };
}
