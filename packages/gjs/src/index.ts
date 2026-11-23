// What the native apps share (docs/index.md). The files that import `gi://`
// run in GJS only; the tests import the pure ones by their file.
export {
  STORAGE_KINDS,
  createFromForm,
  storageOfForm,
  type CreateDeps,
  type CreateError,
  type CreateForm,
  type CreateFromFormResult,
  type StorageKind,
} from './create';
export { gioFiles } from './gio-files';
export { joinByLink, type JoinResult } from './join';
export { filePrefs, type FilePrefs } from './prefs';
export { randomBytes } from './random';
export { editOnTap } from './rows';
export { soupFetch } from './soup-fetch';
export { spacesGroup, type SpacesGroupOptions, type SpacesHost } from './spaces';
export { addStyle, applyStyle, type Style } from './style';
export { installWebPlatform, subtle } from './subtle';
export { createKeyring, type Keyring, type KeyringOptions } from './keyring';
export {
  GITHUB_TOKEN,
  TEST_KEYRING,
  installReport,
  reportIssueUrl,
  showReportDialog,
  type ReportOptions,
} from './report-dialog';
