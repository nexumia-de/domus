// The invite text: what a person who joins a place needs, as JSON, so a link
// and a QR code carry the same four values the Share sheet shows. The
// storage's user name and password are never part of it; the person who
// joins adds the storage with their own. Reading is untrusted input: every
// field is checked, unknown fields are ignored and sizes are capped. Pure.
// Docs: docs/screens-sync.md#invite-link.

import { isUserId } from '../store';
import type { ShareValues } from './share-values';
import { normaliseFolder } from './location';
import { checkAddress } from './storages';

export const INVITE_FORMAT = 'materia-invite';
/** The format before 2026-11-18: no `kind`, always a place. Still read. */
export const LEGACY_INVITE_FORMAT = 'mixtura-invite';
/** What an invite is for; only a place can be joined so far. */
export const INVITE_KIND_PLACE = 'place';
export const INVITE_VERSION = 1;
/** Longest invite text read, in characters; an invite is a few hundred. */
export const MAX_INVITE_CHARS = 4096;
const MAX_ADDRESS = 2048;
const MAX_FOLDER = 512;
const MAX_PASSPHRASE = 512;

export type InviteFailure =
  | 'damaged'
  | 'version'
  | 'kind'
  | 'type'
  | 'no-passphrase'
  | 'bad-address'
  | 'bad-folder'
  | 'bad-place';

export type InviteRead = { ok: true; invite: ShareValues } | { ok: false; reason: InviteFailure };

/** The invite text for the values of a shared place. */
export const inviteText = (values: ShareValues): string =>
  JSON.stringify({
    format: INVITE_FORMAT,
    version: INVITE_VERSION,
    kind: INVITE_KIND_PLACE,
    type: 'webdav',
    address: values.address,
    folder: values.folder,
    place: values.placeCode,
    passphrase: values.passphrase,
  });

const fail = (reason: InviteFailure): InviteRead => ({ ok: false, reason });

/** The values of an invite text, or the first reason it is refused. */
export function readInvite(text: string): InviteRead {
  if (text.length > MAX_INVITE_CHARS) return fail('damaged');
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fail('damaged');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return fail('damaged');
  const o = data as Record<string, unknown>;
  const legacy = o.format === LEGACY_INVITE_FORMAT;
  if ((o.format !== INVITE_FORMAT && !legacy) || typeof o.version !== 'number')
    return fail('damaged');
  if (o.version !== INVITE_VERSION) return fail('version');
  if (!legacy) {
    if (typeof o.kind !== 'string') return fail('damaged');
    if (o.kind !== INVITE_KIND_PLACE) return fail('kind');
  }
  if (o.type !== 'webdav') return fail('type');
  const { passphrase, address, folder, place } = o;
  if (typeof passphrase !== 'string' || passphrase.trim() === '') return fail('no-passphrase');
  if (passphrase.length > MAX_PASSPHRASE) return fail('damaged');
  const checkedAddress =
    typeof address === 'string' && address.length <= MAX_ADDRESS ? checkAddress(address) : null;
  if (checkedAddress === null) return fail('bad-address');
  const checkedFolder =
    typeof folder === 'string' && folder.length <= MAX_FOLDER ? normaliseFolder(folder) : null;
  if (checkedFolder === null) return fail('bad-folder');
  if (typeof place !== 'string' || !isUserId(place)) return fail('bad-place');
  return {
    ok: true,
    invite: { address: checkedAddress, folder: checkedFolder, placeCode: place, passphrase },
  };
}
