// The first page: every dish in one list under the one filter "what you feel like" (character,
// course, cuisine, without meat and fish, only with every amount; the cuisine is the way to one
// country), and the way to what the stock allows; the space and its sync status are the header's
// subtitle.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { statusText } from '@nexumia-de/hospes';
import { isEmptyFilter, type DishFilter } from '@culina/app/core';
import { entryLine } from '../dish-choices';
import { barButton, clear, column, titled, type Page, type Ui } from './context';
import { cookablePage } from './cookable-page';
import { dishFilterRow, type DishFilterRow } from './dish-filter';
import { dishPage } from './dish-page';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function startPage(ui: Ui, menu: any): Page {
  const { session, t, s } = ui;
  const head = titled(t.appName);
  head.header.pack_end(
    new Gtk.MenuButton({
      icon_name: 'open-menu-symbolic',
      menu_model: menu,
      primary: true,
      tooltip_text: t.menu.preferences,
    }),
  );
  const { scrolled, body } = column();
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(barButton(t.start.cookable, true, () => ui.push(cookablePage(ui))));
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const page = new Adw.NavigationPage({ title: t.appName, tag: 'start', child: view });

  let shown = '';
  let filterRow: DishFilterRow | undefined;
  const results = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18 });
  function update(): void {
    const state = session.state();
    const space = state.space;
    head.title.set_subtitle(
      space === undefined
        ? ''
        : [
            space.deviceOnly ? '' : space.name,
            statusText(t.status, session.status(), ui.now(), true),
          ]
            .filter((part) => part !== '')
            .join(' · '),
    );
    if (state.phase === 'failed' || state.phase === 'no-content') {
      shown = '';
      filterRow = undefined;
      clear(body);
      const status = new Adw.StatusPage({
        icon_name: 'dialog-error-symbolic',
        title: state.phase === 'failed' ? t.failure.store : t.failure.content,
        vexpand: true,
      });
      if (state.phase === 'failed') {
        const retry = new Gtk.Button({
          label: t.failure.retry,
          halign: Gtk.Align.CENTER,
          css_classes: ['pill', 'suggested-action'],
        });
        retry.connect('clicked', () => void session.load());
        status.set_child(retry);
      }
      body.append(status);
      return;
    }
    // Nothing until the stock and the content are read (a wake can read the stock first).
    if (state.phase !== 'ready' || session.entries().length === 0) return;
    if (filterRow === undefined) {
      // Made once the content is read: the choices are what the dishes offer.
      shown = '';
      clear(body);
      filterRow = dishFilterRow(ui, (next) => session.setDishFilter(next));
      body.append(
        new Gtk.Label({
          label: s.classics.startTitle,
          xalign: 0,
          css_classes: ['title-2'],
          wrap: true,
        }),
      );
      const filters = new Gtk.ListBox({
        selection_mode: Gtk.SelectionMode.NONE,
        css_classes: ['boxed-list'],
      });
      filters.append(filterRow.row);
      body.append(filters);
      body.append(results);
    }
    const filter = session.dishFilter();
    // The list is the same until the filter changes; a status change alone does not rebuild it.
    const signature = JSON.stringify(filter);
    if (signature === shown) return;
    shown = signature;
    // The filter may have been changed on another page ("what can I cook").
    filterRow.show(filter);
    clear(results);
    const dishes = session.dishes(filter);
    if (dishes.length === 0) {
      const none = new Adw.StatusPage({ title: s.browse.none, icon_name: 'edit-find-symbolic' });
      if (!isEmptyFilter(filter)) none.set_child(resetButton());
      results.append(none);
      return;
    }
    const group = new Adw.PreferencesGroup({ title: s.browse.count(dishes.length) });
    if (!isEmptyFilter(filter)) group.set_header_suffix(resetButton(true));
    for (const entry of dishes) {
      const row = new Adw.ActionRow({ use_markup: false, activatable: true });
      row.set_title(entry.name);
      row.set_subtitle(entryLine(s, entry));
      row.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
      row.connect('activated', () => ui.push(dishPage(ui, entry.id)));
      group.add(row);
    }
    results.append(group);
  }
  /** "Show all": drops every choice of the filter. */
  function resetButton(flat = false): any {
    const button = new Gtk.Button({
      label: s.browse.reset,
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.CENTER,
      css_classes: flat ? ['flat', 'culina-target'] : ['pill', 'culina-target'],
    });
    button.connect('clicked', () => {
      const empty: DishFilter = {};
      session.setDishFilter(empty);
    });
    return button;
  }
  update();
  return { page, update };
}
