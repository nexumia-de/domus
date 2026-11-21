import type { Lang } from '@culina/engine';
import type { Strings } from '@culina/app/core';
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { Session } from '../session';
import type { Texts } from '../strings';

/** What every page gets. `Gtk` and `Adw` objects are untyped here (packages/gjs/src/gi.d.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Ui {
  session: Session;
  /** The native app's own texts. */
  t: Texts;
  /** The web app's texts (dishes, steps, the finder), in the same language. */
  s: Strings;
  lang: Lang;
  prefs: { get(key: string): string | null; set(key: string, value: string): boolean };
  now: () => string;
  /** The window's navigation view: pages are pushed onto it, so swiping back works. */
  nav: any;
  /** Pushes a page and has it redrawn on every change until it is popped. */
  push(made: Page): void;
  window: any;
  /** A toast at the bottom; `undo` adds its button. */
  toast(text: string, undo?: { label: string; run: () => void }): void;
  /** Keeps the screen on while cooking; returns the way to let it sleep again. */
  keepAwake(reason: string): () => void;
  /** The name of a catalogue ingredient in the content language. */
  nameOf(id: string): string;
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

/** A scrolling column inside a clamp: the body of a page. */
export function column(): { scrolled: any; body: any } {
  const body = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 18,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vexpand: true,
    child: new Adw.Clamp({ maximum_size: 600, child: body }),
  });
  return { scrolled, body };
}

/** A header bar with a window title (title and subtitle), as every page has. */
export function titled(title: string): { header: any; title: any } {
  const widget = new Adw.WindowTitle({ title });
  return { header: new Adw.HeaderBar({ title_widget: widget }), title: widget };
}

/** A button of a bottom bar: a pill a finger can hit (at least 44 px high). */
export function barButton(label: string, suggested: boolean, run: () => void): any {
  const button = new Gtk.Button({
    label,
    hexpand: true,
    css_classes: suggested
      ? ['pill', 'suggested-action', 'culina-target']
      : ['pill', 'culina-target'],
  });
  button.connect('clicked', run);
  return button;
}

/** A label that wraps and shows text as it is (no markup). */
export function text(label: string, ...classes: string[]): any {
  return new Gtk.Label({
    label,
    wrap: true,
    xalign: 0,
    hexpand: true,
    use_markup: false,
    selectable: false,
    css_classes: classes,
  });
}
