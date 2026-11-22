// One drink, pushed onto the navigation view: whether the bottles at hand allow it, its
// ingredients, how it is made and its balance as numbers (the engine's figures, no verdict).
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { amountText, fixed, type SpecLine } from '@mixtura/app/core';
import type { Figure } from '@mixtura/engine';
import { joinNames } from '../strings';
import type { Page, Ui } from './context';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function drinkPage(ui: Ui, specId: string): Page {
  const { model, t } = ui;
  const spec = model.specById.get(specId);
  const view = new Adw.ToolbarView();
  view.add_top_bar(new Adw.HeaderBar());
  const page = new Adw.NavigationPage({ title: spec?.name ?? t.appName, child: view });
  if (spec === undefined) {
    view.set_content(new Adw.StatusPage({ title: t.drinks.none }));
    return { page, update: () => undefined };
  }
  const nameOf = (id: string): string => model.ingredientName(id) ?? id;
  const note = (text: string, css: string[]): any =>
    new Gtk.Label({ label: text, wrap: true, xalign: 0, css_classes: css });

  const body = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 18,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  const availability = note('', ['heading']);
  body.append(availability);

  const detail = (title: string, value: string): any => {
    const made = new Adw.ActionRow({ use_markup: false });
    made.set_title(title);
    made.set_subtitle(value);
    return made;
  };
  const figure = (title: string, value: string): any => {
    const made = new Adw.ActionRow({ use_markup: false });
    made.set_title(title);
    made.add_suffix(
      new Gtk.Label({ label: value, valign: Gtk.Align.CENTER, css_classes: ['numeric'] }),
    );
    return made;
  };

  // Ingredients.
  const lines = new Adw.PreferencesGroup({ title: t.drink.ingredients });
  const amount = (line: SpecLine): string =>
    line.unit === 'top' ? t.drink.top : amountText(line, ui.units());
  for (const line of spec.lines) {
    const made = new Adw.ActionRow({ use_markup: false });
    made.set_title(nameOf(line.ingredientId));
    const more = [
      line.substitutes && line.substitutes.length > 0
        ? t.drink.or(
            joinNames(
              line.substitutes.map((s) => nameOf(s.ingredientId)),
              6,
            ),
          )
        : '',
      line.optional === true ? t.drink.optional : '',
      line.note ?? '',
    ].filter((part) => part !== '');
    made.set_subtitle(more.join(' · '));
    made.add_suffix(
      new Gtk.Label({ label: amount(line), valign: Gtk.Align.CENTER, css_classes: ['numeric'] }),
    );
    lines.add(made);
  }
  body.append(lines);

  // Preparation.
  const named = (list: readonly { id: string; name: string }[], id: string | undefined): string =>
    id === undefined ? '' : (list.find((item) => item.id === id)?.name ?? id);
  const prep: [string, string][] = [
    [t.drink.method, named(model.vocabulary.methods, spec.method)],
    [t.drink.glass, named(model.vocabulary.glasses, spec.glass)],
    [t.drink.garnish, spec.garnish ?? ''],
    [t.drink.notes, spec.notes ?? ''],
  ];
  const made = prep.filter(([, value]) => value !== '');
  if (made.length > 0) {
    const group = new Adw.PreferencesGroup({ title: t.drink.details });
    for (const [label, value] of made) group.add(detail(label, value));
    body.append(group);
  }

  // Balance: the engine's figures; an unknown figure says so.
  const balance = model.balanceOf(spec);
  const shownFigures = new Adw.PreferencesGroup({
    title: t.drink.balance,
    description: t.drink.balanceHint,
  });
  const text = (f: Figure | undefined, decimals: number, unit: string): string =>
    f?.known === true ? `${fixed(f.value, decimals)} ${unit}` : t.drink.noFigure;
  if (balance.ok) {
    const f = balance.value;
    const side = f.after ?? f.before;
    shownFigures.add(figure(f.after ? t.drink.abv : t.drink.abvBefore, text(side.abvPct, 1, '%')));
    shownFigures.add(figure(t.drink.sugar, text(side.sugarPer100Ml, 1, 'g')));
    shownFigures.add(figure(t.drink.acid, text(side.acidPct, 2, '%')));
    shownFigures.add(
      figure(t.drink.volume, amountText({ amount: side.volumeMl, unit: 'ml' }, ui.units())),
    );
    body.append(shownFigures);
    if (f.excluded.length > 0) body.append(note(t.drink.notCounted, ['dim-label', 'caption']));
    if (f.estimated) body.append(note(t.drink.estimated, ['dim-label', 'caption']));
  }
  if (spec.source?.name)
    body.append(note(t.drink.source(spec.source.name), ['dim-label', 'caption']));

  view.set_content(
    new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      child: new Adw.Clamp({ maximum_size: 600, child: body }),
    }),
  );

  function update(): void {
    const state = ui.session.state().derived?.states.get(spec?.id ?? '');
    let words = '';
    if (state?.kind === 'makeable') words = t.drink.makeable;
    else if (state?.kind === 'substitute') words = t.drink.substitute;
    else if (state?.kind === 'one') words = t.drink.missingOne(nameOf(state.missing));
    else if (state?.kind === 'several') words = t.drink.missingMany(state.count);
    availability.set_label(words);
    availability.set_visible(words !== '');
  }
  update();
  return { page, update };
}
