// The one filter over the dishes, "what you feel like", as an expander row: a combo row each for
// the character, the course and the cuisine (only when the dishes offer something), and a switch
// row each for "without meat and fish" and "only with every amount". There is no origin row: the
// native app has only shipped dishes. Closed, the row says the choices made. Cook (the first page)
// uses it; the filter is the session's, kept under the web app's key.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { DishFilter } from '@culina/app/core';
import {
  anyName,
  choiceName,
  choicesOf,
  summaryOf,
  withChoice,
  type ListKey,
} from '../dish-choices';
import type { Ui } from './context';

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface DishFilterRow {
  row: any;
  /** Shows another filter (after "Show all") without telling `onChange`. */
  show(filter: DishFilter): void;
}

const LISTS: readonly { key: ListKey; title: (ui: Ui) => string }[] = [
  { key: 'character', title: (ui) => ui.s.browse.characterLabel },
  { key: 'course', title: (ui) => ui.s.browse.courseLabel },
  { key: 'cuisine', title: (ui) => ui.s.browse.cuisineLabel },
];

export function dishFilterRow(ui: Ui, onChange: (next: DishFilter) => void): DishFilterRow {
  const { session, s, lang } = ui;
  let filter = session.dishFilter();
  const choices = choicesOf(session.offered(), filter);
  const row = new Adw.ExpanderRow({ title: s.browse.filtersLabel, use_markup: false });
  let quiet = false;

  const change = (next: DishFilter): void => {
    filter = next;
    row.set_subtitle(summaryOf(s, lang, filter));
    if (!quiet) onChange(filter);
  };

  const combos: { key: ListKey; combo: any }[] = [];
  for (const list of LISTS) {
    const values = choices[list.key];
    // Only "any": the dishes offer nothing to choose, so the row is left out.
    if (values.length < 2) continue;
    const combo = new Adw.ComboRow({
      title: list.title(ui),
      model: Gtk.StringList.new(
        values.map((v) =>
          v === undefined ? anyName(s, list.key) : choiceName(s, lang, list.key, v),
        ),
      ),
      selected: Math.max(0, values.indexOf(filter[list.key])),
    });
    combo.connect('notify::selected', () =>
      change(withChoice(filter, list.key, values[combo.get_selected()])),
    );
    combos.push({ key: list.key, combo });
    row.add_row(combo);
  }
  const meat = new Adw.SwitchRow({ title: s.browse.meatFree, active: filter.meatFree === true });
  meat.connect('notify::active', () =>
    change(withChoice(filter, 'meatFree', meat.get_active() ? true : undefined)),
  );
  const complete = new Adw.SwitchRow({
    title: s.browse.completeOnly,
    active: filter.completeOnly === true,
  });
  complete.connect('notify::active', () =>
    change(withChoice(filter, 'completeOnly', complete.get_active() ? true : undefined)),
  );
  row.add_row(meat);
  row.add_row(complete);
  row.set_subtitle(summaryOf(s, lang, filter));

  return {
    row,
    show(next) {
      quiet = true;
      for (const { key, combo } of combos) {
        combo.set_selected(Math.max(0, choices[key].indexOf(next[key])));
      }
      meat.set_active(next.meatFree === true);
      complete.set_active(next.completeOnly === true);
      quiet = false;
      filter = next;
      row.set_subtitle(summaryOf(s, lang, filter));
    },
  };
}
