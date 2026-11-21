// What the native apps share (docs/index.md). The files that import `gi://`
// run in GJS only; the tests import the pure ones by their file.
export { gioFiles } from './gio-files';
export { joinByLink, type JoinResult } from './join';
export { filePrefs, type FilePrefs } from './prefs';
export { randomBytes } from './random';
export { soupFetch } from './soup-fetch';
export { addStyle, applyStyle, type Style } from './style';
export { installWebPlatform, subtle } from './subtle';
