// The four values another person enters by hand to join a place. One small
// module so an invite link or QR code (a later issue) is built from the same
// values. Docs: docs/screens-sync.md#share.

import type { Binding, Storage } from '../store';

export interface ShareValues {
  /** The address of the storage. */
  address: string;
  /** The folder below it. */
  folder: string;
  /** The place id; the file is `<folder>/<place code>.json`. */
  placeCode: string;
  passphrase: string;
}

export const shareValues = (storage: Storage, binding: Binding): ShareValues => ({
  address: storage.baseUrl,
  folder: binding.folder,
  placeCode: binding.unitId,
  passphrase: binding.passphrase,
});
