// The frame the household apps share: header with the place and the actions, the small sync
// icon with its error banner, and the toast with Undo. CSS: `@nexumia-de/hospes/frame.css`,
// built on the tokens of each app (docs/frame.md).
export { createHeader, headerButton, headerLink } from './header';
export type { FrameHeader, HeaderAttrs, HeaderPage } from './header';
export { createSyncIndicator } from './sync-indicator';
export type { SyncIndicator, SyncIndicatorOptions } from './sync-indicator';
export { syncDisplay, worstStatus } from './sync-display';
export type { SyncDisplay } from './sync-display';
export { createToaster } from './toaster';
export type { Toaster, ToasterOptions, ToastAction } from './toaster';
export { drawIcon, el } from './dom';
export { FRAME_ICONS } from './icons';
export type { FrameIconName } from './icons';
