// The public entry of @nexumia-de/hospes: what the apps may import.
export { base64ToBytes, bytesToBase64 } from './base64';
export { createWebdavAdapter, type WebdavOptions } from './webdav';
export {
  PROBE_PATH,
  testConnection,
  type ConnectionResult,
  type ConnectionState,
} from './webdav-connection';
export { fileUrl, folderUrls, pathSegments } from './webdav-url';

// The GitHub storage and the registry of storage types (docs/github.md).
export { createGithubAdapter, type GithubOptions } from './github';
export {
  DEFAULT_REPOSITORY_NAME,
  DEFAULT_TOKEN_NAME,
  findRepositories,
  setupLinks,
  testGithub,
  type FindRepositoriesResult,
  type GithubConnectionResult,
  type GithubConnectionState,
  type RepositoryEntry,
  type SetupLinks,
} from './github-connection';
export { UnknownStorage, adapterFor, type StorageDeps } from './storage';

// Spaces: the secret, the sealed file, the invite link, local data and the
// sync cycle (docs/spaces.md).
export { base64UrlToBytes, bytesToBase64Url } from './base64url';
export {
  BadSecret,
  SPACE_LABELS,
  deriveSpace,
  newSecret,
  type RandomBytes,
  type Space,
} from './space';
export {
  SEAL_CIPHER,
  openCollection,
  sealCollection,
  type OpenError,
  type OpenResult,
} from './seal';
export {
  inviteFromFragment,
  inviteToFragment,
  inviteUrl,
  type InviteLinkError,
  type InviteLinkResult,
} from './invite-link';
export {
  copyState,
  emptyState,
  type CollectionState,
  type Store,
  type StoredSpace,
  type StoredStorage,
} from './store';
export { createMemoryStore } from './memory-store';
export { StoreFileError, createFileStore, createMemoryFiles, type Files } from './file-store';
export { DEVICE_ONLY, deviceOnlyStorage, ensureSpace, isDeviceOnly } from './device';
export {
  DB_NAME,
  DB_VERSION,
  StoreBlocked,
  StoreOpenError,
  createIdbStore,
  type IdbStoreOptions,
} from './idb-store';
export {
  BadClock,
  collectionPath,
  localChange,
  syncCollection,
  type CycleFailure,
  type CycleResult,
  type LocalEdit,
  type SyncOptions,
} from './cycle';
export {
  DEFAULT_INTERVAL_MS,
  MAX_BACKOFF_MS,
  POKE_DELAY_MS,
  WATCH_SAFETY_MS,
  createSyncLoop,
  type SyncLoop,
  type SyncLoopOptions,
} from './watch';
export {
  createCollectionSync,
  type CollectionSync,
  type CollectionSyncOptions,
  type SyncStatus,
} from './collection-sync';
export { pickSpace, viewOf, type SpaceView } from './space-choice';
export { ago, statusText, type StatusWords } from './status-text';
