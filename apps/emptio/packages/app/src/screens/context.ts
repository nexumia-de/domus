import type { App } from '../app';
import type { Lang, Prefs } from '../prefs';
import type { Strings } from '../strings';

/** What every screen gets. */
export interface Ctx {
  app: App;
  t: Strings;
  lang: Lang;
  prefs: Prefs;
  now: () => string;
  isOnline: () => boolean;
  /** Says something in the live region of the page; `undo` adds a button to it. */
  say(text: string, undo?: { label: string; run: () => void }): void;
  go(hash: string): void;
}

/** A screen: its node, and `update` for a change of the app's state while it is shown. */
export interface Screen {
  node: HTMLElement;
  /** What stays at the bottom of the window while the screen scrolls. */
  dock?: HTMLElement;
  update(): void;
}
