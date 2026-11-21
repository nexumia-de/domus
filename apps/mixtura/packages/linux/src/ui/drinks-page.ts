// The drinks: every drink of the built-in data by name, or only what the bottles at hand
// allow; the search and the two buttons are in a bottom bar within reach of the thumb.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { statusText } from '@nexumia-de/hospes';
import { hasStock, normalise, type Availability, type Drink } from '@mixtura/app/core';
import { bottlesPage } from './bottles-page';
import { joinNames } from '../strings';
import { clear, type Page, type Ui } from './context';
import { drinkPage } from './drink-page';

/** Rows drawn per group before "Show more": hundreds of rows would slow a phone. */
const STEP = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function drinksPage(ui: Ui, menu: any): Page {
  const { session, model, t } = ui;
  const title = new Adw.WindowTitle({ title: t.appName });
  const header = new Adw.HeaderBar({ title_widget: title });
  header.pack_end(
    new Gtk.MenuButton({
      icon_name: 'open-menu-symbolic',
      menu_model: menu,
      primary: true,
      tooltip_text: t.menu.preferences,
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
  const status = new Adw.StatusPage({ vexpand: true });
  const stack = new Gtk.Stack();
  stack.add_named(scrolled, 'list');
  stack.add_named(status, 'status');

  const search = new Gtk.SearchEntry({
    hexpand: true,
    placeholder_text: t.drinks.search,
    css_classes: ['mixtura-target'],
  });
  search.update_property([Gtk.AccessibleProperty.LABEL], [t.drinks.search]);
  const only = new Gtk.ToggleButton({
    icon_name: 'emblem-ok-symbolic',
    tooltip_text: t.drinks.canMake,
    css_classes: ['mixtura-target'],
  });
  only.update_property([Gtk.AccessibleProperty.LABEL], [t.drinks.canMake]);
  const bottles = new Gtk.Button({
    icon_name: 'view-list-symbolic',
    tooltip_text: t.drinks.bottles,
    css_classes: ['mixtura-target'],
  });
  bottles.update_property([Gtk.AccessibleProperty.LABEL], [t.drinks.bottles]);
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(search);
  bar.append(only);
  bar.append(bottles);

  const view = new Adw.ToolbarView({ content: stack });
  view.add_top_bar(header);
  view.add_bottom_bar(bar);
  const page = new Adw.NavigationPage({ title: t.appName, tag: 'drinks', child: view });

  const openBottles = (): void => ui.push(bottlesPage(ui));
  bottles.connect('clicked', openBottles);

  let query = '';
  let limit = STEP;
  /** What the list showed last, so a status change alone does not rebuild the rows. */
  let shown = '';
  const derivedIds = new WeakMap<object, number>();
  let derivedCount = 0;

  search.connect('search-changed', () => {
    query = search.get_text();
    limit = STEP;
    update();
  });
  only.connect('toggled', () => {
    limit = STEP;
    update();
  });

  const tagOf = (state: Availability | undefined): string => {
    if (state === undefined) return '';
    switch (state.kind) {
      case 'makeable':
        return t.drinks.tagMakeable;
      case 'substitute':
        return t.drinks.tagSubstitute;
      case 'one':
        return t.drinks.tagMissingOne(model.ingredientName(state.missing) ?? state.missing);
      case 'several':
        return t.drinks.tagMissingMany(state.count);
    }
  };

  function row(drink: Drink, state: Availability | undefined, tag: boolean): any {
    const names = drink.spec.lines
      .map((line) => model.ingredientName(line.ingredientId))
      .filter((name): name is string => name !== undefined);
    // Markup is switched off before the texts are set: a name may hold "&" or "<".
    const line = new Adw.ActionRow({ use_markup: false, activatable: true });
    line.set_title(drink.spec.name);
    const text = tag ? tagOf(state) : '';
    const doable = state?.kind === 'makeable' || state?.kind === 'substitute';
    // What can be made is a short mark at the end of the row; what is missing leads the subtitle.
    line.set_subtitle(joinNames(names));
    if (text !== '' && !doable) line.set_subtitle(`${text} · ${joinNames(names)}`);
    if (text !== '' && doable) {
      line.add_suffix(
        new Gtk.Label({
          label: text,
          wrap: true,
          max_width_chars: 12,
          xalign: 1,
          valign: Gtk.Align.CENTER,
          css_classes: ['caption', 'success'],
        }),
      );
    }
    line.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
    line.connect('activated', () => ui.push(drinkPage(ui, drink.spec.id)));
    return line;
  }

  function group(
    heading: string,
    drinks: readonly Drink[],
    states: ReadonlyMap<string, Availability> | undefined,
    tag: boolean,
  ): any {
    const made = new Adw.PreferencesGroup({ title: heading });
    for (const drink of drinks.slice(0, limit))
      made.add(row(drink, states?.get(drink.spec.id), tag));
    if (drinks.length > limit) {
      const more = new Gtk.Button({
        label: t.drinks.showMore(Math.min(STEP, drinks.length - limit)),
        halign: Gtk.Align.CENTER,
        css_classes: ['pill', 'mixtura-target'],
      });
      more.connect('clicked', () => {
        limit += STEP;
        update();
      });
      const wrap = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, margin_top: 12 });
      wrap.append(more);
      made.add(wrap);
    }
    return made;
  }

  function showStatus(
    icon: string | null,
    text: string,
    description: string | null,
    button?: { label: string; run: () => void },
  ): void {
    shown = '';
    status.set_icon_name(icon);
    status.set_title(text);
    status.set_description(description);
    status.set_child(null);
    if (button) {
      const made = new Gtk.Button({
        label: button.label,
        halign: Gtk.Align.CENTER,
        css_classes: ['pill', 'suggested-action'],
      });
      made.connect('clicked', button.run);
      status.set_child(made);
    }
    stack.set_visible_child_name('status');
  }

  function update(): void {
    const state = session.state();
    const space = state.space;
    title.set_subtitle(
      space === undefined
        ? ''
        : [
            space.deviceOnly ? '' : space.name,
            statusText(t.status, session.status(space.id), ui.now(), true),
          ]
            .filter((part) => part !== '')
            .join(' · '),
    );
    bar.set_sensitive(state.phase === 'ready');
    if (state.phase === 'failed') {
      return showStatus('dialog-error-symbolic', t.failure.store, null, {
        label: t.failure.retry,
        run: () => void session.load(),
      });
    }
    if (state.phase !== 'ready') return showStatus(null, t.drinks.loading, null);

    const derived = state.derived;
    const states = derived?.states;
    const atHand = hasStock(model, state.records);
    const words = normalise(query).split(' ').filter(Boolean);
    const found = model.drinks.filter((d) => words.every((w) => d.search.includes(w)));

    let groups: { heading: string; drinks: Drink[] }[];
    if (only.get_active()) {
      const of = (kind: Availability['kind']): Drink[] =>
        found.filter((d) => states?.get(d.spec.id)?.kind === kind);
      const makeable = of('makeable');
      const substitute = of('substitute');
      const one = of('one');
      groups = [
        { heading: t.drinks.makeable(makeable.length), drinks: makeable },
        { heading: t.drinks.substitute(substitute.length), drinks: substitute },
        { heading: t.drinks.missingOne(one.length), drinks: one },
      ].filter((g) => g.drinks.length > 0);
      if (!atHand) {
        return showStatus(
          'emblem-ok-symbolic',
          t.drinks.nothingAtHand,
          t.drinks.nothingAtHandHint,
          {
            label: t.drinks.openBottles,
            run: openBottles,
          },
        );
      }
    } else {
      groups = [{ heading: t.drinks.all(found.length), drinks: found }];
    }
    if (found.length === 0 || groups.length === 0) {
      return showStatus('system-search-symbolic', t.drinks.none, t.drinks.noneHint);
    }
    stack.set_visible_child_name('list');

    const key = derived ?? state;
    let id = derivedIds.get(key);
    if (id === undefined) derivedIds.set(key, (id = ++derivedCount));
    const signature = JSON.stringify([query, only.get_active(), limit, id, space?.id]);
    if (signature === shown) return;
    shown = signature;
    clear(body);
    const tag = !only.get_active();
    for (const g of groups) body.append(group(g.heading, g.drinks, states, tag));
  }

  update();
  return { page, update };
}
