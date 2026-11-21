// The part of Web Crypto the host package uses for spaces, for a host that has
// none (GJS): HKDF-SHA-256 and AES-256-GCM on audited pure JavaScript
// (@noble/hashes, @noble/ciphers). The same calls give the same bytes as a
// browser; test/subtle.test.ts checks that against Node's Web Crypto in both
// directions. Only what `deriveSpace`, `sealCollection` and `openCollection`
// call is here; anything else throws.
import { gcm } from '@noble/ciphers/aes.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';

type Bytes = ArrayBuffer | ArrayBufferView;

/** What stands in for a CryptoKey: the raw key and what it is for. Never leaves the process. */
interface Key {
  readonly algorithm: 'HKDF' | 'AES-GCM';
  readonly raw: Uint8Array;
}

const bytesOf = (data: Bytes): Uint8Array =>
  data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);

/** A copy in a buffer of its own, as Web Crypto returns. */
const bufferOf = (bytes: Uint8Array): ArrayBuffer => {
  const out = new ArrayBuffer(bytes.length);
  new Uint8Array(out).set(bytes);
  return out;
};

class Unsupported extends Error {
  constructor(what: string) {
    super(`Not supported by this Web Crypto subset: ${what}`);
    this.name = 'NotSupportedError';
  }
}

/** Authentication failed, as a browser's `OperationError`. */
class OperationError extends Error {
  constructor() {
    super('The operation failed');
    this.name = 'OperationError';
  }
}

interface HkdfParams {
  name: string;
  hash: string;
  salt: Bytes;
  info: Bytes;
}
interface GcmParams {
  name: string;
  iv: Bytes;
  additionalData?: Bytes;
}

function derive(params: HkdfParams, key: Key, length: number): Uint8Array {
  if (params.name !== 'HKDF' || params.hash !== 'SHA-256') throw new Unsupported(params.name);
  if (key.algorithm !== 'HKDF') throw new Unsupported('deriving from a key that is not HKDF');
  return hkdf(sha256, key.raw, bytesOf(params.salt), bytesOf(params.info), length);
}

function cipher(params: GcmParams, key: Key) {
  if (params.name !== 'AES-GCM' || key.algorithm !== 'AES-GCM') throw new Unsupported(params.name);
  return gcm(
    key.raw,
    bytesOf(params.iv),
    params.additionalData === undefined ? undefined : bytesOf(params.additionalData),
  );
}

export const subtle = {
  importKey(format: string, data: Bytes, algorithm: string): Promise<Key> {
    if (format !== 'raw' || algorithm !== 'HKDF') {
      return Promise.reject(new Unsupported(`importKey ${format} ${algorithm}`));
    }
    return Promise.resolve({ algorithm: 'HKDF', raw: bytesOf(data).slice() });
  },
  async deriveBits(params: HkdfParams, key: Key, bits: number): Promise<ArrayBuffer> {
    return bufferOf(derive(params, key, bits / 8));
  },
  async deriveKey(
    params: HkdfParams,
    key: Key,
    derived: { name: string; length: number },
  ): Promise<Key> {
    if (derived.name !== 'AES-GCM' || derived.length !== 256) {
      throw new Unsupported(`deriveKey ${derived.name} ${derived.length}`);
    }
    return { algorithm: 'AES-GCM', raw: derive(params, key, 32) };
  },
  /** The ciphertext with the 16-byte tag after it, as Web Crypto gives it. */
  async encrypt(params: GcmParams, key: Key, data: Bytes): Promise<ArrayBuffer> {
    return bufferOf(cipher(params, key).encrypt(bytesOf(data)));
  },
  async decrypt(params: GcmParams, key: Key, data: Bytes): Promise<ArrayBuffer> {
    const opened = cipher(params, key);
    try {
      return bufferOf(opened.decrypt(bytesOf(data)));
    } catch {
      throw new OperationError();
    }
  },
};

/**
 * Puts `crypto` (the subset, random values from `random`, and `randomUUID`) and
 * `structuredClone` on the global object where the host has none.
 * @param random Cryptographically strong random bytes.
 */
export function installWebPlatform(random: (length: number) => Uint8Array): void {
  const scope = globalThis as Record<string, unknown>;
  if (scope['crypto'] === undefined) {
    const getRandomValues = <T extends ArrayBufferView>(array: T): T => {
      new Uint8Array(array.buffer, array.byteOffset, array.byteLength).set(
        random(array.byteLength),
      );
      return array;
    };
    const value = {
      subtle,
      getRandomValues,
      randomUUID(): string {
        const b = random(16);
        b[6] = ((b[6] ?? 0) & 0x0f) | 0x40;
        b[8] = ((b[8] ?? 0) & 0x3f) | 0x80;
        const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      },
    };
    Object.defineProperty(globalThis, 'crypto', { value, configurable: true, writable: true });
  }
  // What the stores copy is JSON (records, spaces), so a JSON copy is a full one.
  scope['structuredClone'] ??= <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
}
