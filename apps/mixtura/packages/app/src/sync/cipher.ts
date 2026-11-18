// The sync cipher on Web Crypto only: PBKDF2-HMAC-SHA-256 into a
// non-extractable AES-256-GCM key, a fresh nonce per seal, the envelope's
// format and version bound as additional data. See docs/sync-encryption.md.
import { envelopeAad, type Cipher, type Envelope } from '@mixtura/engine';
import { base64ToBytes, bytesToBase64 } from './base64';
import { UnsupportedEnvelope, WrongPassphrase } from './errors';

export const DEFAULT_ITERATIONS = 600_000;
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 10_000_000;
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const CACHE_LIMIT = 8;

export interface CipherOptions {
  /** Iterations for new files; tests only, production code leaves it out. */
  iterations?: number;
  /** Lowest iteration count `open` accepts; tests only. */
  minIterations?: number;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

const random = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));
const buffer = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;

/** A cipher with its own small in-memory cache of derived keys. */
export function createCipher(options: CipherOptions = {}): Cipher {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const minIterations = options.minIterations ?? MIN_ITERATIONS;
  const cache = new Map<string, Promise<CryptoKey>>();

  const keyFor = (passphrase: string, salt: Uint8Array, count: number): Promise<CryptoKey> => {
    const id = `${count}\0${bytesToBase64(salt)}\0${passphrase}`;
    const hit = cache.get(id);
    if (hit) return hit;
    const derived = (async () => {
      const material = await crypto.subtle.importKey(
        'raw',
        encoder.encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      return crypto.subtle.deriveKey(
        { name: 'PBKDF2', hash: 'SHA-256', salt: buffer(salt), iterations: count },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
    cache.delete(id);
    for (const oldest of cache.keys()) {
      if (cache.size < CACHE_LIMIT) break;
      cache.delete(oldest);
    }
    cache.set(id, derived);
    derived.catch(() => cache.delete(id));
    return derived;
  };

  /** The salt and nonce bytes when scheme, parameters and lengths are acceptable. */
  const readParams = (e: Envelope): { salt: Uint8Array; nonce: Uint8Array } | undefined => {
    const salt = base64ToBytes(e.kdf.salt);
    const nonce = base64ToBytes(e.cipher.nonce);
    const ok =
      e.kdf.name === 'PBKDF2' &&
      e.kdf.hash === 'SHA-256' &&
      e.cipher.name === 'AES-GCM' &&
      Number.isInteger(e.kdf.iterations) &&
      e.kdf.iterations >= minIterations &&
      e.kdf.iterations <= MAX_ITERATIONS &&
      salt?.length === SALT_BYTES &&
      nonce?.length === NONCE_BYTES;
    return ok ? { salt, nonce } : undefined;
  };

  return {
    async seal(plaintext, passphrase, previous) {
      const reuse = previous && readParams(previous);
      const salt = reuse ? reuse.salt : random(SALT_BYTES);
      const count = reuse && previous ? previous.kdf.iterations : iterations;
      const nonce = random(NONCE_BYTES);
      const head = { format: 'materia-sync', version: 1 } as const;
      const key = await keyFor(passphrase, salt, count);
      const sealed = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: buffer(nonce), additionalData: encoder.encode(envelopeAad(head)) },
        key,
        encoder.encode(plaintext),
      );
      return {
        ...head,
        kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: count, salt: bytesToBase64(salt) },
        cipher: { name: 'AES-GCM', nonce: bytesToBase64(nonce) },
        data: bytesToBase64(new Uint8Array(sealed)),
      };
    },

    async open(envelope, passphrase) {
      const params = readParams(envelope);
      if (!params) throw new UnsupportedEnvelope('unknown scheme or parameters');
      const data = base64ToBytes(envelope.data);
      if (!data || data.length < 16) throw new WrongPassphrase();
      const key = await keyFor(passphrase, params.salt, envelope.kdf.iterations);
      try {
        const plain = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: buffer(params.nonce),
            additionalData: encoder.encode(envelopeAad(envelope)),
          },
          key,
          buffer(data),
        );
        return decoder.decode(plain);
      } catch {
        throw new WrongPassphrase();
      }
    },
  };
}
