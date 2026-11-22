// Base64url without padding (RFC 4648 section 5), on top of the padded
// standard coding of base64.ts. The secret and the invite link use this form.
import { base64ToBytes, bytesToBase64 } from './base64';

/** Encodes bytes as base64url without padding. */
export function bytesToBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

/** Decodes base64url without padding; returns undefined for anything else. */
export function base64UrlToBytes(text: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9_-]*$/.test(text) || text.length % 4 === 1) return undefined;
  const standard = text.replace(/-/g, '+').replace(/_/g, '/');
  return base64ToBytes(standard + '='.repeat((4 - (standard.length % 4)) % 4));
}
