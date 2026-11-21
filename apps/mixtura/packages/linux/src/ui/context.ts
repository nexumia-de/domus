import type { DisplaySystem } from '@mixtura/engine';
import type { BrowseModel } from '@mixtura/app/core';
import type { Session } from '../session';
import type { Texts } from '../strings';

/** What every page gets. `Gtk` and `Adw` objects are untyped here (packages/gjs/src/gi.d.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Ui {
  session: Session;
  model: BrowseModel;
  t: Texts;
  prefs: { get(key: string): string | null; set(key: string, value: string): boolean };
  now: () => string;
  /** The window's navigation view: pages are pushed onto it, so swiping back works. */
  nav: any;
  /** Pushes a page and has it redrawn on every change until it is popped. */
  push(made: Page): void;
  window: any;
  /** The display system of amounts, from the preferences. */
  units(): DisplaySystem;
  /** A toast at the bottom; `undo` adds its button. */
  toast(text: string, undo?: { label: string; run: () => void }): void;
}

/** A page of the navigation view and what redraws it when the state changed. */
export interface Page {
  page: any;
  update(): void;
}

/** Removes every child of a container, as the pages rebuild their rows. */
export function clear(box: any): void {
  for (let child = box.get_first_child(); child !== null; child = box.get_first_child()) {
    box.remove(child);
  }
}
