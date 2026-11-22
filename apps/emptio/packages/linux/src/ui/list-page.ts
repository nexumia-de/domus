// The list: open entries by priority, bought ones below, and the add field in
// a bottom bar within reach of the thumb.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { DEFAULT_PRIORITY, PRIORITIES, homeOrder, type Entry } from '@emptio/engine';
import {
  addToList,
  categoriesOf,
  clearBought,
  orderOf,
  restoreEntries,
  setBought,
  statusText,
} from '@emptio/app/core';
import type { Page, Ui } from './context';
import { entryPage } from './entry-page';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function listPage(ui: Ui, menu: any): Page {
  const { app, t } = ui;
  const title = new Adw.WindowTitle({ title: t.appName });
  const header = new Adw.HeaderBar({ title_widget: title });
  header.pack_end(
    new Gtk.MenuButton({
      icon_name: 'open-menu-symbolic',
      menu_model: menu,
      primary: true,
      tooltip_text: t.nav.settings,
    }),
  );

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
  // Pulling the list down past its top syncs (docs/behaviour.md#sync); the menu has Sync now too.
  let pulling = false;
  scrolled.connect('edge-overshot', (_scrolled: unknown, position: number) => {
    if (position !== Gtk.PositionType.TOP || pulling) return;
    pulling = true;
    ui.toast(ui.n.status.syncing);
    void app.syncNow().finally(() => (pulling = false));
  });
  const status = new Adw.StatusPage({ vexpand: true });
  const stack = new Gtk.Stack();
  stack.add_named(scrolled, 'list');
  stack.add_named(status, 'status');

  // The add field: name, how pressing, and the button.
  const name = new Gtk.Entry({
    hexpand: true,
    placeholder_text: t.list.addPlaceholder,
    input_hints: Gtk.InputHints.WORD_COMPLETION,
    css_classes: ['emptio-target'],
  });
  name.update_property([Gtk.AccessibleProperty.LABEL], [t.list.addLabel]);
  const pressing = Gtk.DropDown.new_from_strings(PRIORITIES.map((step) => t.priority[step]));
  pressing.set_selected(PRIORITIES.indexOf(DEFAULT_PRIORITY));
  pressing.add_css_class('emptio-target');
  pressing.set_tooltip_text(t.priorityLabel);
  pressing.update_property([Gtk.AccessibleProperty.LABEL], [t.priorityLabel]);
  const add = new Gtk.Button({
    icon_name: 'list-add-symbolic',
    tooltip_text: t.list.add,
    css_classes: ['suggested-action', 'emptio-target'],
  });
  add.update_property([Gtk.AccessibleProperty.LABEL], [t.list.add]);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(name);
  bar.append(pressing);
  bar.append(add);

  const submit = (): void => {
    const text: string = name.get_text();
    if (text.trim() === '') return;
    const priority = PRIORITIES[pressing.get_selected()] ?? DEFAULT_PRIORITY;
    void app
      .act((deps, spaceId) => addToList(deps, spaceId, { name: text, priority }))
      .then((done) => {
        if (done === undefined) return ui.toast(t.failure.write);
        if (done === null) return;
        if (done.joined) ui.toast(t.list.raised(text.trim()));
        name.set_text('');
        pressing.set_selected(PRIORITIES.indexOf(DEFAULT_PRIORITY));
      });
  };
  name.connect('activate', submit);
  add.connect('clicked', submit);

  const view = new Adw.ToolbarView({ content: stack });
  view.add_top_bar(header);
  view.add_bottom_bar(bar);
  const page = new Adw.NavigationPage({ title: t.appName, tag: 'list', child: view });

  function row(entry: Entry, category: string): any {
    const detail = [entry.amount, entry.bought === undefined ? category : undefined, entry.note]
      .filter((part) => part !== undefined && part !== '')
      .join(' · ');
    // Markup is switched off before the texts are set: a name may hold "&" or "<".
    const line = new Adw.ActionRow({ use_markup: false, activatable: true });
    line.set_title(entry.name);
    line.set_subtitle(detail);
    const tick = new Gtk.CheckButton({
      active: entry.bought !== undefined,
      valign: Gtk.Align.CENTER,
      css_classes: ['selection-mode', 'emptio-target'],
    });
    tick.update_property([Gtk.AccessibleProperty.LABEL], [t.list.tick(entry.name)]);
    tick.connect('toggled', () => {
      const bought: boolean = tick.get_active();
      void app
        .act((deps, spaceId) => setBought(deps, spaceId, entry.id, bought))
        .then((done) => {
          if (done === undefined) ui.toast(t.failure.write);
        });
    });
    line.add_prefix(tick);
    line.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
    if (entry.bought !== undefined) line.add_css_class('dim-label');
    line.connect('activated', () => ui.nav.push(entryPage(ui, entry.id).page));
    return line;
  }

  function clear(): void {
    void app
      .act((deps, spaceId) => clearBought(deps, spaceId))
      .then((removed) => {
        if (removed === undefined) return ui.toast(t.failure.write);
        if (removed.length === 0) return;
        ui.toast(t.list.cleared(removed.length), {
          label: t.list.undo,
          run: () => void app.act((deps, spaceId) => restoreEntries(deps, spaceId, removed)),
        });
      });
  }

  /** What the list showed last, so a status change alone does not rebuild the rows. */
  let shown = '';

  function update(): void {
    const state = app.state();
    const space = state.space;
    title.set_subtitle(
      space === undefined
        ? ''
        : [space.name, statusText(ui.n.status, app.status(space.id), ui.now(), true)]
            .filter((part) => part !== '')
            .join(' · '),
    );
    bar.set_sensitive(state.phase === 'ready');
    if (state.phase !== 'ready') {
      shown = '';
      status.set_icon_name(state.phase === 'failed' ? 'dialog-error-symbolic' : null);
      status.set_title(state.phase === 'failed' ? t.failure.store : t.list.loading);
      status.set_description(null);
      status.set_child(null);
      if (state.phase === 'failed') {
        const retry = new Gtk.Button({
          label: t.failure.retry,
          halign: Gtk.Align.CENTER,
          css_classes: ['pill'],
        });
        retry.connect('clicked', () => void app.load());
        status.set_child(retry);
      }
      return stack.set_visible_child_name('status');
    }
    if (state.entries.length === 0) {
      shown = '';
      status.set_icon_name('checkbox-checked-symbolic');
      status.set_title(t.list.empty);
      status.set_description(t.list.emptyHint);
      status.set_child(null);
      return stack.set_visible_child_name('status');
    }
    stack.set_visible_child_name('list');
    const signature = JSON.stringify([state.entries, state.changes]);
    if (signature === shown) return;
    shown = signature;

    const order = orderOf(state.changes);
    const names = new Map(
      categoriesOf(state.changes, ui.lang, t.categories.unnamed).map((c) => [c.id, c.name]),
    );
    const other = names.get('other') ?? '';
    const sorted = homeOrder(state.entries, order);
    for (let child = body.get_first_child(); child !== null; child = body.get_first_child()) {
      body.remove(child);
    }
    for (const step of PRIORITIES) {
      const ofStep = sorted.filter((e) => e.bought === undefined && e.priority === step);
      if (ofStep.length === 0) continue;
      const group = new Adw.PreferencesGroup({ title: t.priority[step] });
      for (const entry of ofStep) {
        // A category that is gone or hidden counts as the last one, as in the order.
        const known = order.includes(entry.categoryId) ? names.get(entry.categoryId) : undefined;
        group.add(row(entry, known ?? other));
      }
      body.append(group);
    }
    const bought = sorted.filter((e) => e.bought !== undefined);
    if (bought.length > 0) {
      const group = new Adw.PreferencesGroup({ title: t.list.bought(bought.length) });
      const button = new Gtk.Button({
        label: t.list.clearBought,
        valign: Gtk.Align.CENTER,
        css_classes: ['flat', 'emptio-target'],
      });
      button.connect('clicked', clear);
      group.set_header_suffix(button);
      for (const entry of bought) group.add(row(entry, ''));
      body.append(group);
    }
  }

  update();
  return { page, update };
}
