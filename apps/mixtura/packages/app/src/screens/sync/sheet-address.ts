// The sheets of the Sync page are the address parameter `sheet` (`storage`,
// `bind`, `move`, `share`, `passphrase`, `join`) with `place` or `code`: one
// history entry on a phone, so Back closes them; a replace on a wide screen.
// Nothing secret is ever in the address.

import { back, go, replace } from '../../navigation';
import { formatHash } from '../../router';
import { type ScreenContext } from '../../screen';

export type SyncSheet = 'storage' | 'bind' | 'move' | 'share' | 'passphrase' | 'join';

const SHEETS: readonly SyncSheet[] = ['storage', 'bind', 'move', 'share', 'passphrase', 'join'];

const wide = (): boolean => window.matchMedia('(min-width: 840px)').matches;

/** The sheet the address names, if any. */
export function openSheetOf(context: ScreenContext): SyncSheet | null {
  const name = context.route.query.get('sheet');
  return SHEETS.find((s) => s === name) ?? null;
}

/** The place the sheet is about (`place`), or the place code a join starts with (`code`). */
export const sheetPlace = (context: ScreenContext): string | null =>
  context.route.query.get('place');
export const sheetCode = (context: ScreenContext): string | null => context.route.query.get('code');

export function syncAddress(
  sheet: SyncSheet | null,
  params: { place?: string; code?: string } = {},
): string {
  const query = new URLSearchParams();
  if (sheet) query.set('sheet', sheet);
  if (params.place) query.set('place', params.place);
  if (params.code) query.set('code', params.code);
  return formatHash(['settings', 'sync'], query);
}

export function openSyncSheet(
  context: ScreenContext,
  sheet: SyncSheet,
  params: { place?: string; code?: string } = {},
): void {
  const address = syncAddress(sheet, params);
  if (wide()) replace(context.store, address);
  else go(context.store, address);
}

export function closeSyncSheet(context: ScreenContext): void {
  const address = syncAddress(null);
  if (wide()) replace(context.store, address);
  else back(context.store, address);
}
