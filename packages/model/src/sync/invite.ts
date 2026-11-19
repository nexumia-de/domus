// What a person gives another to join a space (docs/sync.md#the-invite). An
// object, not a text: how it becomes a link or a QR code is the app's business.

import { compareText } from './canonical';
import { isObj, text } from './frame';

/** The format name of an invite. */
export const INVITE_FORMAT = 'materia-invite';
/** The version of the invite this package reads and writes (version 1 was a place invite and is not read). */
export const INVITE_VERSION = 2;

const SECRET = /^[A-Za-z0-9_-]{43}$/;
const STORAGE_TYPE = /^[a-z][a-z0-9-]*$/;
const ACCESS_KEY = /^[a-z][a-zA-Z0-9]*$/;

export interface Invite {
  format: 'materia-invite';
  version: 2;
  /** The space's secret, base64url without padding (32 bytes). */
  secret: string;
  /** What the inviting person calls the space; display only. */
  name?: string;
  storage: { type: string; address: string };
  /** Values (for example a token) the inviting person chose to include. */
  access?: Record<string, string>;
}

export type InviteError = 'not-an-invite' | 'older-version' | 'newer-version' | 'invalid';

/**
 * Checks an already parsed JSON value as an invite. Unknown fields are
 * ignored; inside `storage` too, so the result has only the known fields.
 * @param value The parsed value (not text).
 * @returns The invite, or the first problem: not an invite object, version 1,
 * a version above 2, or a broken field.
 */
export function parseInvite(
  value: unknown,
): { ok: true; invite: Invite } | { ok: false; error: InviteError } {
  if (!isObj(value) || value.format !== INVITE_FORMAT) return { ok: false, error: 'not-an-invite' };
  if (typeof value.version === 'number' && value.version > INVITE_VERSION) {
    return { ok: false, error: 'newer-version' };
  }
  if (value.version === 1) return { ok: false, error: 'older-version' };
  const { storage, access } = value;
  if (
    value.version !== INVITE_VERSION ||
    typeof value.secret !== 'string' ||
    !SECRET.test(value.secret) ||
    (value.name !== undefined && typeof value.name !== 'string') ||
    !isObj(storage) ||
    typeof storage.type !== 'string' ||
    !STORAGE_TYPE.test(storage.type) ||
    !text(storage.address) ||
    (access !== undefined &&
      (!isObj(access) ||
        !Object.entries(access).every(([k, v]) => ACCESS_KEY.test(k) && typeof v === 'string')))
  ) {
    return { ok: false, error: 'invalid' };
  }
  const invite: Invite = {
    format: INVITE_FORMAT,
    version: INVITE_VERSION,
    secret: value.secret,
    storage: { type: storage.type, address: storage.address },
  };
  if (value.name !== undefined) invite.name = value.name as string;
  if (access !== undefined) invite.access = { ...(access as Record<string, string>) };
  return { ok: true, invite };
}

/**
 * Gives the invite object with a fixed key order, the keys of `access` sorted
 * and absent optional fields left out.
 * @param invite The invite.
 * @returns A clean copy, ready for JSON or a link.
 */
export function buildInvite(invite: Invite): Invite {
  const { access } = invite;
  const sorted: Record<string, string> = {};
  for (const k of Object.keys(access ?? {}).sort(compareText))
    sorted[k] = (access ?? {})[k] as string;
  return {
    format: INVITE_FORMAT,
    version: INVITE_VERSION,
    secret: invite.secret,
    ...(invite.name === undefined ? {} : { name: invite.name }),
    storage: { type: invite.storage.type, address: invite.storage.address },
    ...(access === undefined ? {} : { access: sorted }),
  };
}
