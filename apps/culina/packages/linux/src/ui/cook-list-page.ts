// Cook, the first page (the web app's Cook screen, apps/culina/docs/decisions/cook-screen.md):
// every dish in one list under the one filter "what you feel like", with the switch "Only with what
// I have" (the finder's judgement for complete dishes) and the order "By name" or "Use up first"
// (the dishes that use a stock item with a use-by date first, in the engine's ranking). Which dishes
// pass and in which order is the session's `cookView`, the web app's `dishListView`; nothing is
// judged here. "What is there" in the bottom bar opens the stock; the space and its sync status are
// the header's subtitle. By name the list stands in the web app's groups (the frames, then by
// course), one preferences group each under its name and count; "Use up first", or one group left,
// is one list.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { statusText } from '@nexumia-de/hospes';
import {
  isEmptyFilter,
  useUpNote,
  useUpWords,
  type CookList,
  type DishFilter,
  type ListRow,
  type UseUpNow,
} from '@culina/app/core';
import { groupTitle, rowLine } from '../dish-choices';
import { barButton, clear, column, text, titled, type Page, type Ui } from './context';
import { dishFilterRow, type DishFilterRow } from './dish-filter';
import { dishPage } from './dish-page';
import { stockPage } from './stock-page';

/** The orders of the list, in the order of the combo row. */
const ORDERS: readonly CookList['order'][] = ['name', 'use-up'];

/* eslint-disable @typescript-eslint/no-explicit-any */
export function cookListPage(ui: Ui, menu: any): Page {
  const { session, t, s } = ui;
  const head = titled(s.cook.title);
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
  const openStock = (): void => ui.push(stockPage(ui));
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(barButton(s.cook.tabStock, true, openStock));
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const page = new Adw.NavigationPage({ title: s.cook.title, tag: 'cook', child: view });

  let shown = '';
  let filterRow: DishFilterRow | undefined;
  let have: any;
  let order: any;
  /** True while the page sets the controls itself: no change is written back. */
  let quiet = false;
  const note = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 12 });
  const results = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18 });

  const setList = (next: CookList): void => {
    if (!quiet) session.setCookList(next);
  };

  /** The line under a dish: course, cuisine, meat, and in "Use up first" what sets its place. */
  const subtitle = (row: ListRow, useUp: UseUpNow | undefined): string =>
    [
      rowLine(s, row),
      ...(row.meta.useUp === undefined || useUp === undefined
        ? []
        : useUpWords(row.meta.useUp, (id) => useUp.itemName(id))),
    ]
      .filter((part) => part !== '')
      .join(' · ');

  function build(): void {
    shown = '';
    clear(body);
    filterRow = dishFilterRow(ui, (next) => session.setDishFilter(next));
    const kept = session.cookList();
    have = new Adw.SwitchRow({ title: s.cook.haveLabel, active: kept.have });
    have.connect('notify::active', () =>
      setList({ ...session.cookList(), have: have.get_active() }),
    );
    order = new Adw.ComboRow({
      title: s.cook.orderLabel,
      model: Gtk.StringList.new([s.cook.orderName, s.cook.tabUseUp]),
      selected: Math.max(0, ORDERS.indexOf(kept.order)),
    });
    order.connect('notify::selected', () =>
      setList({ ...session.cookList(), order: ORDERS[order.get_selected()] ?? 'name' }),
    );
    const controls = new Gtk.ListBox({
      selection_mode: Gtk.SelectionMode.NONE,
      css_classes: ['boxed-list'],
    });
    controls.append(filterRow.row);
    controls.append(have);
    controls.append(order);
    body.append(controls);
    body.append(note);
    body.append(results);
  }

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
    // Made once the content is read: the filter's choices are what the dishes offer.
    if (filterRow === undefined) build();
    const filter = session.dishFilter();
    const list = session.cookList();
    const cook = session.cookView(filter, list);
    // The list is the same until something it shows changes; a status change alone does not
    // rebuild it.
    const signature = JSON.stringify([
      filter,
      list,
      cook.noStock,
      cook.useUp === undefined ? null : [cook.useUp.ok, cook.useUp.anyDated],
      cook.rows.map((row) => [row.entry.key, row.meta.useUp ?? null]),
    ]);
    if (signature === shown) return;
    shown = signature;
    // The choices may have been changed elsewhere ("Show all", another window).
    filterRow?.show(filter);
    quiet = true;
    have.set_active(list.have);
    order.set_selected(Math.max(0, ORDERS.indexOf(list.order)));
    quiet = false;
    clear(note);
    clear(results);
    // The quiet line takes no room when there is nothing to say.
    const noDates = useUpNote(cook.useUp) === 'no-dates';
    if (noDates) note.append(text(s.cook.useUpNoDates, 'dim-label'));
    note.set_visible(noDates);
    if (cook.noStock) {
      // "Only with what I have" with nothing ticked: the way to tick, not an empty list.
      // Compact, so that the way to tick stays on a phone's first screen under the choices.
      const none = new Adw.StatusPage({
        title: s.cook.emptyNothingTicked,
        icon_name: 'edit-find-symbolic',
        css_classes: ['compact'],
      });
      const tick = new Gtk.Button({
        label: s.cook.tickLink,
        halign: Gtk.Align.CENTER,
        css_classes: ['pill', 'culina-target'],
      });
      tick.connect('clicked', openStock);
      none.set_child(tick);
      results.append(none);
      return;
    }
    const narrowed = !isEmptyFilter(filter) || list.have;
    if (cook.rows.length === 0) {
      const none = new Adw.StatusPage({ title: s.browse.none, icon_name: 'edit-find-symbolic' });
      if (narrowed) none.set_child(resetButton());
      results.append(none);
      return;
    }
    const rowOf = (found: ListRow): any => {
      const row = new Adw.ActionRow({ use_markup: false, activatable: true });
      row.set_title(found.entry.name);
      row.set_subtitle(subtitle(found, cook.useUp));
      row.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
      row.connect('activated', () => ui.push(dishPage(ui, found.entry.id)));
      return row;
    };
    // The count of the whole list, with "Show all" beside it; flat, the rows stand under it.
    const count = new Adw.PreferencesGroup({ title: s.browse.count(cook.rows.length) });
    if (narrowed) count.set_header_suffix(resetButton(true));
    results.append(count);
    if (cook.groups === undefined) {
      for (const found of cook.rows) count.add(rowOf(found));
      return;
    }
    for (const part of cook.groups) {
      const group = new Adw.PreferencesGroup({ title: groupTitle(s, part) });
      for (const found of part.rows) group.add(rowOf(found));
      results.append(group);
    }
  }

  /** "Show all": drops every choice of the filter and "Only with what I have"; the order stays. */
  function resetButton(flat = false): any {
    const button = new Gtk.Button({
      label: s.browse.reset,
      halign: Gtk.Align.CENTER,
      valign: Gtk.Align.CENTER,
      css_classes: flat ? ['flat', 'culina-target'] : ['pill', 'culina-target'],
    });
    button.connect('clicked', () => {
      const list = session.cookList();
      if (list.have) session.setCookList({ ...list, have: false });
      const empty: DishFilter = {};
      session.setDishFilter(empty);
    });
    return button;
  }
  update();
  return { page, update };
}
