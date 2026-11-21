// What is there: the stock of the shown space. The items at hand are listed with a switch each;
// a search over the ingredient catalogue finds what to switch on. A switch writes the shared
// collection `stock` at once (the web app's edits, which keep the fields of other apps), and an
// untick offers Undo.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { displayName, matchesAnyName } from '@culina/app/core';
import { clear, column, titled, type Page, type Ui } from './context';

/** Rows drawn for a search: hundreds would slow a phone. */
const LIMIT = 40;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function stockPage(ui: Ui): Page {
  const { session, t } = ui;
  const head = titled(t.stock.title);
  const { scrolled, body } = column();
  const search = new Gtk.SearchEntry({
    hexpand: true,
    placeholder_text: t.stock.search,
    css_classes: ['culina-target'],
  });
  search.update_property([Gtk.AccessibleProperty.LABEL], [t.stock.search]);
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(search);
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const page = new Adw.NavigationPage({ title: t.stock.title, tag: 'stock', child: view });

  const entries = [...session.catalogue().values()];

  const toggle = (id: string, name: string, on: boolean): void => {
    if (on) {
      void session.tick(id).then((ok) => ok && ui.toast(t.stock.ticked(name)));
      return;
    }
    void session.untick(id).then((undo) => {
      if (undo === undefined) return;
      ui.toast(t.stock.unticked(name), {
        label: t.stock.undo,
        run: () => void session.restore(undo),
      });
    });
  };

  function row(id: string, name: string, on: boolean): any {
    const line = new Adw.ActionRow({ use_markup: false, activatable: true });
    line.set_title(name);
    const toggler = new Gtk.Switch({ active: on, valign: Gtk.Align.CENTER });
    toggler.update_property([Gtk.AccessibleProperty.LABEL], [ui.s.stock.tickLabel(name)]);
    toggler.connect('state-set', (_switch: unknown, state: boolean) => {
      if (state !== on) toggle(id, name, state);
      return false;
    });
    line.add_suffix(toggler);
    line.set_activatable_widget(toggler);
    return line;
  }

  let shown = '';
  function update(): void {
    const state = session.state();
    head.title.set_subtitle(t.stock.atHand(new Set(state.stock.map((item) => item.ref.id)).size));
    bar.set_sensitive(state.phase === 'ready');
    const query = search.get_text().trim();
    const at = new Set(state.stock.map((item) => item.ref.id));
    const signature = JSON.stringify([query, [...at].sort(), state.space?.id]);
    if (signature === shown) return;
    shown = signature;
    clear(body);
    if (query === '') {
      body.append(
        new Gtk.Label({ label: t.stock.hint, wrap: true, xalign: 0, css_classes: ['dim-label'] }),
      );
      const group = new Adw.PreferencesGroup({ title: t.cookable.stock });
      const names = [...at].map((id) => ({ id, name: ui.nameOf(id) }));
      names.sort((a, b) => a.name.localeCompare(b.name));
      for (const { id, name } of names) group.add(row(id, name, true));
      body.append(group);
      return;
    }
    const found = entries.filter((entry) => matchesAnyName(entry, query));
    if (found.length === 0) {
      body.append(new Adw.StatusPage({ title: t.stock.none, icon_name: 'system-search-symbolic' }));
      return;
    }
    const group = new Adw.PreferencesGroup();
    for (const entry of found.slice(0, LIMIT)) {
      group.add(row(entry.id, displayName(entry, ui.lang), at.has(entry.id)));
    }
    body.append(group);
    if (found.length > LIMIT) {
      body.append(
        new Gtk.Label({
          label: t.stock.more(found.length - LIMIT),
          wrap: true,
          xalign: 0,
          css_classes: ['dim-label'],
        }),
      );
    }
  }
  search.connect('search-changed', update);
  update();
  return { page, update };
}
