// The bottles: what is at hand, as switches in groups (one group per kind of ingredient)
// or, while searching, as one list of matches. A switch writes the mark at once; the
// drinks follow. "Clear all" acts at once and offers Undo.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  buildStockTree,
  drinkCounts,
  presentIds,
  viewRows,
  type StockNode,
} from '@mixtura/app/core';
import { clear, type Page, type Ui } from './context';

/** Matches drawn while searching; more would only be scrolled past. */
const MATCHES = 50;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function bottlesPage(ui: Ui): Page {
  const { session, model, t } = ui;
  const header = new Adw.HeaderBar();
  const reset = new Gtk.Button({
    icon_name: 'edit-clear-all-symbolic',
    tooltip_text: t.bottles.clear,
    css_classes: ['mixtura-target'],
  });
  reset.update_property([Gtk.AccessibleProperty.LABEL], [t.bottles.clear]);
  header.pack_end(reset);

  const groupsBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 18,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  const resultsBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 18,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  const none = new Adw.StatusPage({
    icon_name: 'system-search-symbolic',
    title: t.bottles.none,
    description: t.drinks.noneHint,
    vexpand: true,
  });
  const stack = new Gtk.Stack();
  const scroller = (child: any): any =>
    new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      vexpand: true,
      child: new Adw.Clamp({ maximum_size: 600, child }),
    });
  stack.add_named(scroller(groupsBox), 'groups');
  stack.add_named(scroller(resultsBox), 'results');
  stack.add_named(none, 'none');

  const search = new Gtk.SearchEntry({
    hexpand: true,
    placeholder_text: t.bottles.search,
    css_classes: ['mixtura-target'],
  });
  search.update_property([Gtk.AccessibleProperty.LABEL], [t.bottles.search]);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(search);
  const view = new Adw.ToolbarView({ content: stack });
  view.add_top_bar(header);
  view.add_bottom_bar(bar);
  const page = new Adw.NavigationPage({ title: t.bottles.title, child: view });

  const counts = drinkCounts(model);
  /** Every switch of the page by ingredient id; one id can be in a group and in the matches. */
  const switches = new Map<string, Set<any>>();
  /** What is being set from the state, so a switch does not write what it only shows. */
  let drawing = false;
  const register = (id: string, row: any): void => {
    const set = switches.get(id) ?? new Set();
    set.add(row);
    switches.set(id, set);
  };

  function switchRow(node: StockNode): any {
    const row = new Adw.SwitchRow({ use_markup: false, css_classes: ['mixtura-target'] });
    row.set_title(node.name);
    const n = counts.get(node.id) ?? 0;
    row.set_subtitle(n > 0 ? t.bottles.inDrinks(n) : '');
    row.set_active(session.state().records.get(node.id)?.present === true);
    row.connect('notify::active', () => {
      if (drawing) return;
      const on: boolean = row.get_active();
      void session.mark([node.id], on).then((done) => {
        if (done === undefined) {
          ui.toast(t.failure.write);
          update();
        }
      });
    });
    register(node.id, row);
    return row;
  }

  const descendants = (node: StockNode): StockNode[] =>
    node.children.flatMap((child) => [child, ...descendants(child)]);
  const byName = (a: StockNode, b: StockNode): number =>
    a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  const treeNow = (): StockNode[] =>
    buildStockTree(model.tree, session.state().records, counts, t.bottles.other);

  /** The expanders of the groups, by group id, built once: the tree's shape never changes. */
  const expanders = new Map<string, any>();
  for (const node of treeNow()) {
    const expander = new Adw.ExpanderRow({ use_markup: false });
    expander.set_title(node.name);
    for (const item of descendants(node).sort(byName)) expander.add_row(switchRow(item));
    expanders.set(node.id, expander);
  }
  const list = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.NONE,
    css_classes: ['boxed-list'],
  });
  for (const expander of expanders.values()) list.append(expander);
  groupsBox.append(list);

  let query = '';
  let resultRows: { id: string; row: any }[] = [];
  search.connect('search-changed', () => {
    query = search.get_text();
    update();
  });

  function drawMatches(roots: StockNode[]): number {
    // The rows of an earlier search are forgotten; the groups' own stay.
    for (const { id, row } of resultRows) switches.get(id)?.delete(row);
    resultRows = [];
    clear(resultsBox);
    const { matches } = viewRows(roots, { q: query, show: 'all', expanded: new Set() });
    const found = matches.filter((node) => model.tree.byId.get(node.id)?.parentId !== undefined);
    if (found.length === 0) return 0;
    const group = new Adw.PreferencesGroup();
    for (const node of found.slice(0, MATCHES)) {
      const row = switchRow(node);
      resultRows.push({ id: node.id, row });
      group.add(row);
    }
    resultsBox.append(group);
    if (found.length > MATCHES) {
      resultsBox.append(
        new Gtk.Label({
          label: t.bottles.more(found.length - MATCHES),
          wrap: true,
          css_classes: ['dim-label', 'caption'],
        }),
      );
    }
    return found.length;
  }

  function update(): void {
    const state = session.state();
    const roots = treeNow();
    drawing = true;
    try {
      for (const node of roots) {
        expanders
          .get(node.id)
          ?.set_subtitle(
            t.bottles.count(
              descendants(node).filter((n) => n.present).length,
              descendants(node).length,
            ),
          );
      }
      if (query.trim() === '') {
        stack.set_visible_child_name('groups');
      } else {
        stack.set_visible_child_name(drawMatches(roots) > 0 ? 'results' : 'none');
      }
      for (const [id, set] of switches) {
        const on = state.records.get(id)?.present === true;
        for (const row of set) if (row.get_active() !== on) row.set_active(on);
      }
    } finally {
      drawing = false;
    }
    reset.set_sensitive(presentIds(state.records).length > 0);
    search.set_sensitive(state.phase === 'ready');
  }

  reset.connect('clicked', () => {
    const ids = presentIds(session.state().records);
    void session.mark(ids, false).then((done) => {
      if (done === undefined) return ui.toast(t.failure.write);
      if (done.length === 0) return;
      ui.toast(t.bottles.cleared(done.length), {
        label: t.bottles.undo,
        run: () => void session.mark(done, true),
      });
    });
  });

  update();
  return { page, update };
}
