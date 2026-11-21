import type { App, Lang, Prefs, Strings } from '@emptio/app/core';

/** What every page gets. `Gtk` and `Adw` objects are untyped here (packages/gjs/src/gi.d.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Ui {
  app: App;
  t: Strings;
  lang: Lang;
  prefs: Prefs;
  now: () => string;
  /** The window's navigation view: pages are pushed onto it, so swiping back works. */
  nav: any;
  window: any;
  /** A toast at the bottom; `undo` adds its button. */
  toast(text: string, undo?: { label: string; run: () => void }): void;
}

/** A page of the navigation view and what redraws it when the app's state changed. */
export interface Page {
  page: any;
  update(): void;
}
