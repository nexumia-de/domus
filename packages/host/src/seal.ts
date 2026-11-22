// One file of a space: a collection document, encrypted with AES-256-GCM
// under the space's key, in materia's sealed file (version 2). The additional
// data names space and collection, so a file put in another's place fails.
import {
  buildCollection,
  buildSealed,
  parseCollection,
  parseSealed,
  sealedAad,
  type CollectionDocument,
} from '@nexumia-de/materia';
import { base64ToBytes, bytesToBase64 } from './base64';
import { type RandomBytes, type Space } from './space';

/** The name `cipher.name` carries. */
export const SEAL_CIPHER = 'AES-256-GCM';
const NONCE_BYTES = 12;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const buffer = (b: Uint8Array): ArrayBuffer => b.slice().buffer as ArrayBuffer;
const defaultRandom: RandomBytes = (n) => crypto.getRandomValues(new Uint8Array(n));

/**
 * Why a file did not open. `wrong-key` covers a wrong secret, a changed
 * file and a file of another collection or space put in its place: the
 * authentication tag fails in all three and they cannot be told apart.
 */
export type OpenError =
  | 'not-sealed'
  | 'newer-version'
  | 'wrong-key'
  | 'bad-document'
  | 'other-space'
  | 'other-collection';

export type OpenResult =
  { ok: true; document: CollectionDocument } | { ok: false; error: OpenError; detail?: string };

/**
 * Encrypts a collection document into the text of its file.
 * @param space The derived space.
 * @param document The document; its `collection` names the file.
 * @param random Source of the nonce; defaults to `crypto.getRandomValues`.
 * @returns The file text; two calls give different texts (fresh nonce).
 * @throws Error when the collection name breaks materia's name rule.
 */
export async function sealCollection(
  space: Space,
  document: CollectionDocument,
  random: RandomBytes = defaultRandom,
): Promise<string> {
  const aad = sealedAad(space.id, document.collection);
  if (aad === undefined) throw new Error(`Bad collection name: ${document.collection}`);
  const nonce = random(NONCE_BYTES);
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: buffer(nonce), additionalData: buffer(encoder.encode(aad)) },
    space.key,
    buffer(encoder.encode(buildCollection(document))),
  );
  return buildSealed({
    format: 'materia-sync',
    version: 2,
    cipher: { name: SEAL_CIPHER, nonce: bytesToBase64(nonce) },
    data: bytesToBase64(new Uint8Array(data)),
  });
}

/**
 * Opens the text of a file as the expected collection of a space. Never
 * throws for a bad file; the result says why it did not open.
 * @param space The derived space.
 * @param collectionName The collection the file is expected to hold.
 * @param text The file text as read from the storage.
 */
export async function openCollection(
  space: Space,
  collectionName: string,
  text: string,
): Promise<OpenResult> {
  const parsed = parseSealed(text);
  if (!parsed.ok) {
    return parsed.error === 'newer-version'
      ? { ok: false, error: 'newer-version' }
      : { ok: false, error: 'not-sealed', detail: parsed.error };
  }
  const { sealed } = parsed;
  const aad = sealedAad(space.id, collectionName);
  if (aad === undefined) throw new Error(`Bad collection name: ${collectionName}`);
  const nonce = base64ToBytes(sealed.cipher.nonce);
  const data = base64ToBytes(sealed.data);
  if (sealed.cipher.name !== SEAL_CIPHER) {
    return { ok: false, error: 'not-sealed', detail: `unsupported cipher ${sealed.cipher.name}` };
  }
  if (nonce?.length !== NONCE_BYTES || !data) {
    return { ok: false, error: 'not-sealed', detail: 'bad nonce or data' };
  }
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: buffer(nonce), additionalData: buffer(encoder.encode(aad)) },
      space.key,
      buffer(data),
    );
  } catch {
    return { ok: false, error: 'wrong-key' };
  }
  let json: string;
  try {
    json = decoder.decode(plain);
  } catch {
    return { ok: false, error: 'bad-document', detail: 'not text' };
  }
  const doc = parseCollection(json);
  if (!doc.ok) {
    return doc.error === 'newer-version'
      ? { ok: false, error: 'newer-version' }
      : { ok: false, error: 'bad-document', detail: doc.error };
  }
  if (doc.collection.space !== space.id) return { ok: false, error: 'other-space' };
  if (doc.collection.collection !== collectionName) return { ok: false, error: 'other-collection' };
  return { ok: true, document: doc.collection };
}
