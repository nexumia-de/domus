// A classic: the portions, the ingredients with the amounts for them (the engine's numbers), the
// method, and the source. "Cook step by step" is in the bottom bar. Nutrition and the handling
// and substitute notes of the web app are not here (docs/native-linux.md).
import { pickText, type Classic } from '@culina/engine';
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  classics,
  cookView,
  dishView,
  portionsOf,
  setPortions,
  techniques,
  type DishView,
  type StepView,
} from '@culina/app/core';
import { barButton, clear, column, text, titled, type Page, type Ui } from './context';
import { cookPage } from './cook-page';
import { lineList } from './lines';

const MAX_PORTIONS = 99;

/* eslint-disable @typescript-eslint/no-explicit-any */
export function dishPage(ui: Ui, id: string): Page {
  const { t, s } = ui;
  const classic = classics().find((c) => c.id === id);
  const head = titled(classic ? pickText(classic.name, ui.lang) : id);
  const { scrolled, body } = column();
  const view = new Adw.ToolbarView({ content: scrolled });
  view.add_top_bar(head.header);
  const title = classic ? head.title.get_title() : id;
  const page = new Adw.NavigationPage({ title, tag: `dish-${id}`, child: view });
  if (classic === undefined) {
    body.append(new Adw.StatusPage({ title: s.classics.unknownDish, vexpand: true }));
    return { page, update: () => undefined };
  }

  const dish: Classic = classic;
  const cook = barButton(t.dish.cook, true, () => ui.push(cookPage(ui, classic.id)));
  const bar = new Gtk.Box({ spacing: 6, css_classes: ['toolbar'] });
  bar.append(cook);
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));

  const stepper = portionsRow();
  const portionGroup = new Adw.PreferencesGroup();
  portionGroup.add(stepper.row);
  let portions = portionsOf(classic.id);
  const stepsOf = (): StepView[] => {
    const steps = cookView(classic, portions, ui.lang, ui.nameOf, techniques(), new Set());
    return steps.ok ? steps.steps : [];
  };

  function portionsRow(): { row: any; set(n: number): void; minus: any; plus: any } {
    const row = new Adw.ActionRow({ use_markup: false });
    row.set_title(t.dish.portions);
    const minus = new Gtk.Button({
      icon_name: 'list-remove-symbolic',
      tooltip_text: s.classics.portionsFewer,
      valign: Gtk.Align.CENTER,
      css_classes: ['circular', 'culina-target'],
    });
    const plus = new Gtk.Button({
      icon_name: 'list-add-symbolic',
      tooltip_text: s.classics.portionsMore,
      valign: Gtk.Align.CENTER,
      css_classes: ['circular', 'culina-target'],
    });
    minus.update_property([Gtk.AccessibleProperty.LABEL], [s.classics.portionsFewer]);
    plus.update_property([Gtk.AccessibleProperty.LABEL], [s.classics.portionsMore]);
    const count = new Gtk.Label({ width_chars: 3, css_classes: ['title-3'] });
    row.add_suffix(minus);
    row.add_suffix(count);
    row.add_suffix(plus);
    return { row, set: (n) => count.set_label(String(n)), minus, plus };
  }
  stepper.minus.connect('clicked', () => change(portions - 1));
  stepper.plus.connect('clicked', () => change(portions + 1));

  function change(next: number): void {
    portions = Math.max(1, Math.min(MAX_PORTIONS, next));
    setPortions(dish.id, portions);
    draw();
  }

  function sourceGroup(shown: DishView): any {
    const { source, persons } = shown;
    const group = new Adw.ExpanderRow({ title: t.dish.source, use_markup: false });
    const line = (title: string, subtitle?: string): void => {
      const row = new Adw.ActionRow({ use_markup: false });
      row.set_title(title);
      if (subtitle !== undefined) row.set_subtitle(subtitle);
      group.add_row(row);
    };
    if (shown.frameParts !== undefined) {
      line(s.classics.frameSource);
      for (const part of shown.frameParts)
        line(
          part.source.own === true
            ? s.classics.framePartOwn(part.name)
            : s.classics.framePartCited(
                part.name,
                part.source.author,
                part.source.title,
                part.source.year,
              ),
        );
      line(s.classics.ownPersons(persons.value));
      line(s.classics.frameChecked);
    } else if (source.own === true) {
      line(s.classics.ownSource);
      line(s.classics.ownPersons(persons.value));
      line(s.classics.ownChecked);
    } else {
      line(s.classics.sourceLine(source.author, source.title, source.year));
      line(s.classics.sourcePlace(source.place));
      if (source.licence !== undefined) line(s.classics.sourceLicence(source.licence));
      line(
        persons.basis === 'stated'
          ? s.classics.personsStated(persons.value)
          : s.classics.personsSettled(persons.value),
      );
      line(s.classics.checkMethod[shown.check.method]);
      const url = source.url;
      const link = new Adw.ActionRow({ use_markup: false, activatable: true });
      link.set_title(s.classics.sourceLink);
      link.set_subtitle(url);
      link.add_suffix(new Gtk.Image({ icon_name: 'adw-external-link-symbolic' }));
      link.connect('activated', () => Gtk.show_uri(ui.window, url, 0));
      group.add_row(link);
    }
    if (shown.note !== undefined) line(s.classics.remarkDish(shown.note));
    for (const remark of shown.sourceRemarks.lines) {
      line(s.classics.remarkLine(remark.name, remark.original, remark.remark));
    }
    for (const step of shown.sourceRemarks.steps) {
      line(s.classics.remarkStep(step.number, step.remark));
    }
    return group;
  }

  function draw(): void {
    clear(body);
    const result = dishView(dish, portions, ui.lang, ui.nameOf);
    if (!result.ok) {
      body.append(new Adw.StatusPage({ title: s.classics.portionsUnknown, vexpand: true }));
      return;
    }
    const shown = result.view;
    head.title.set_subtitle(
      `${s.classics.course[shown.course]} · ${shown.vegetarian ? s.classics.withoutMeat : s.classics.withMeat}`,
    );
    stepper.set(portions);
    stepper.minus.set_sensitive(portions > 1);
    stepper.plus.set_sensitive(portions < MAX_PORTIONS);
    const top = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
    top.append(text(shown.name, 'title-2'));
    top.append(text(s.classics.originalName(shown.originalName), 'dim-label'));
    body.append(top);
    body.append(portionGroup);

    const ingredients = new Adw.PreferencesGroup({ title: t.dish.ingredients });
    const lists = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 18 });
    ingredients.add(lists);
    body.append(ingredients);
    const several = shown.components.length > 1;
    for (const component of shown.components) {
      if (component.lines.length === 0) continue;
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
      if (several) box.append(text(component.name, 'heading'));
      box.append(lineList(ui, component.lines));
      lists.append(box);
    }
    if (shown.slots.length > 0) {
      const box = new Gtk.Box({ orientation: Gtk.Orientation.VERTICAL, spacing: 6 });
      if (several) box.append(text(s.classics.dishHeading, 'heading'));
      box.append(lineList(ui, shown.slots));
      lists.append(box);
    }

    const steps = stepsOf();
    if (steps.length > 0) {
      const method = new Adw.PreferencesGroup({ title: t.dish.method });
      for (const step of steps) {
        const row = new Adw.ActionRow({ use_markup: false });
        row.set_title(step.text);
        row.add_prefix(
          new Gtk.Label({
            label: String(step.number),
            valign: Gtk.Align.START,
            css_classes: ['heading', 'dim-label'],
            margin_top: 12,
          }),
        );
        method.add(row);
      }
      body.append(method);
    }
    const foot = new Adw.PreferencesGroup();
    foot.add(sourceGroup(shown));
    body.append(foot);
  }

  draw();
  // The catalogue's names are the same for the whole run, so nothing else redraws the page.
  return { page, update: () => undefined };
}
