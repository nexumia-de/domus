// What can I cook: the classics the stock of the shown space allows, judged by the engine, and
// the nearest ones when none fits. The filters are the web app's (how much may lack, the country,
// without meat and fish) and are kept in the preferences file. "What is there" in the bottom bar
// opens the stock.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  CLASSIC_COUNTRIES,
  MAX_LACKING,
  type ClassicCountry,
  type ClassicRow,
  type CookFilters,
} from '@culina/app/core';
import { barButton, clear, column, titled, type Page, type Ui } from './context';
import { dishPage } from './dish-page';
import { stockPage } from './stock-page';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function cookablePage(ui: Ui): Page {
  const { session, t, s } = ui;
  const head = titled(t.cookable.title);
  const { scrolled, body } = column();
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(barButton(t.cookable.stock, false, () => ui.push(stockPage(ui))));
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const page = new Adw.NavigationPage({ title: t.cookable.title, tag: 'cookable', child: view });

  const kept = session.filters();
  const lacking = new Adw.ComboRow({
    title: t.cookable.lacking,
    model: Gtk.StringList.new(
      Array.from({ length: MAX_LACKING + 1 }, (_, n) => s.cook.lackingOptions[n as 0 | 1 | 2 | 3]),
    ),
    selected: kept.lacking,
  });
  const countries: (ClassicCountry | undefined)[] = [undefined, ...CLASSIC_COUNTRIES];
  const country = new Adw.ComboRow({
    title: s.cook.countryLabel,
    model: Gtk.StringList.new(
      countries.map((c) => (c === undefined ? s.cook.countryAny : s.classics.countries[c])),
    ),
    selected: countries.indexOf(kept.country),
  });
  const meat = new Adw.ComboRow({
    title: s.cook.meatLabel,
    model: Gtk.StringList.new([s.cook.meatAny, s.cook.meatFree]),
    selected: kept.meatFree === true ? 1 : 0,
  });
  const filters = new Adw.PreferencesGroup({ title: t.cookable.filters });
  filters.add(lacking);
  filters.add(country);
  filters.add(meat);
  const results = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18 });
  body.append(filters);
  body.append(results);

  const read = (): CookFilters => {
    const chosen = countries[country.get_selected()];
    return {
      lacking: lacking.get_selected(),
      ...(chosen === undefined ? {} : { country: chosen }),
      ...(meat.get_selected() === 1 ? { meatFree: true as const } : {}),
    };
  };

  const row = (found: ClassicRow, needs: boolean): any => {
    const line = new Adw.ActionRow({ use_markup: false, activatable: true });
    line.set_title(found.name);
    const parts = [
      `${s.classics.countries[found.country]} · ${found.status}`,
      ...(found.lacks.length > 0 ? [`${s.cook.needsHeading}: ${found.lacks.join(', ')}`] : []),
      ...found.substitutions,
    ];
    line.set_subtitle(needs ? parts.join('\n') : parts[0] ?? '');
    line.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
    line.connect('activated', () => ui.push(dishPage(ui, found.id)));
    return line;
  };

  let shown = '';
  function update(): void {
    const state = session.state();
    head.title.set_subtitle(state.space?.deviceOnly === false ? state.space.name : '');
    const filtersNow = read();
    const found = session.cookable(filtersNow);
    // What the list showed last: a status change alone does not rebuild the rows.
    const signature = JSON.stringify([filtersNow, found, state.space?.id]);
    if (signature === shown) return;
    shown = signature;
    clear(results);
    if (!found.ok) {
      results.append(new Adw.StatusPage({ title: s.cook.problem, icon_name: 'dialog-error-symbolic' }));
      return;
    }
    if (found.shown.length > 0) {
      const group = new Adw.PreferencesGroup({ title: s.cook.classicsListLabel });
      for (const candidate of found.shown) group.add(row(candidate, true));
      results.append(group);
      return;
    }
    const status = new Adw.StatusPage({
      icon_name: 'emblem-ok-symbolic',
      title: found.hasStock ? t.cookable.nothingFits : t.cookable.nothingAtHand,
      description: found.hasStock ? null : t.cookable.nothingAtHandHint,
    });
    results.append(status);
    if (found.nearest.length > 0) {
      const group = new Adw.PreferencesGroup({ title: t.cookable.sectionNearest });
      for (const candidate of found.nearest) group.add(row(candidate, true));
      results.append(group);
    }
  }
  for (const control of [lacking, country, meat]) {
    control.connect('notify::selected', () => {
      session.setFilters(read());
      update();
    });
  }
  update();
  return { page, update };
}
