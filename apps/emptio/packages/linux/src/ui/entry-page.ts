// One entry, pushed onto the navigation view: name, amount, note, how pressing
// and the category; Save in the bottom bar, Remove at the end of the page.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import { PRIORITIES } from '@emptio/engine';
import { categoriesOf, editEntry, removeEntries, restoreEntries } from '@emptio/app/core';
import type { Page, Ui } from './context';

export function entryPage(ui: Ui, id: string): Page {
  const { app, t } = ui;
  const entry = app.state().entries.find((e) => e.id === id);
  const view = new Adw.ToolbarView();
  view.add_top_bar(new Adw.HeaderBar());
  const page = new Adw.NavigationPage({ title: entry?.name ?? t.entry.title, child: view });
  if (entry === undefined) {
    view.set_content(new Adw.StatusPage({ title: t.entry.gone }));
    return { page, update: () => undefined };
  }

  const name = new Adw.EntryRow({ title: t.entry.name, text: entry.name });
  const amount = new Adw.EntryRow({ title: t.entry.amount, text: entry.amount ?? '' });
  const note = new Adw.EntryRow({ title: t.entry.note, text: entry.note ?? '' });
  const pressing = new Adw.ComboRow({
    title: t.priorityLabel,
    model: Gtk.StringList.new(PRIORITIES.map((step) => t.priority[step])),
    selected: PRIORITIES.indexOf(entry.priority),
  });
  // The shown categories, and the entry's own even when it is hidden; one that is gone
  // reads as the last ("other") until the person chooses.
  const all = categoriesOf(app.state().changes, ui.lang, t.categories.unnamed);
  const choices = all.filter((c) => !c.hidden || c.id === entry.categoryId);
  const at = choices.findIndex((c) => c.id === entry.categoryId);
  const fallback = choices.findIndex((c) => c.id === 'other');
  const category = new Adw.ComboRow({
    title: t.entry.category,
    model: Gtk.StringList.new(choices.map((c) => c.name)),
    selected: at >= 0 ? at : Math.max(0, fallback),
  });
  const fields = new Adw.PreferencesGroup();
  for (const line of [name, amount, note, pressing, category]) fields.add(line);

  const day = (time: string): string => time.slice(0, 10);
  const origins = entry.origins
    .map((origin) =>
      origin.kind === 'typed'
        ? t.entry.typed(day(entry.addedAt))
        : origin.kind === 'recipe'
          ? t.entry.recipe(origin.app, origin.title)
          : t.entry.staple,
    )
    .join(' ');
  const why = new Gtk.Label({
    label:
      entry.bought === undefined ? origins : `${origins} ${t.entry.boughtOn(day(entry.bought.at))}`,
    wrap: true,
    xalign: 0,
    css_classes: ['dim-label', 'caption'],
  });

  const remove = new Gtk.Button({
    label: t.entry.remove,
    halign: Gtk.Align.CENTER,
    margin_top: 24,
    css_classes: ['destructive-action', 'pill', 'emptio-target'],
  });
  remove.connect('clicked', () => {
    void app
      .act((deps, spaceId) => removeEntries(deps, spaceId, [id]).then(() => true))
      .then((done) => {
        if (done === undefined) return ui.toast(t.failure.write);
        ui.toast(t.list.removed(entry.name), {
          label: t.list.undo,
          run: () => void app.act((deps, spaceId) => restoreEntries(deps, spaceId, [entry])),
        });
        ui.nav.pop();
      });
  });

  const body = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  body.append(fields);
  body.append(why);
  body.append(remove);
  view.set_content(
    new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      child: new Adw.Clamp({ maximum_size: 600, child: body }),
    }),
  );

  const save = new Gtk.Button({
    label: t.entry.save,
    hexpand: true,
    css_classes: ['suggested-action', 'emptio-target'],
  });
  save.connect('clicked', () => {
    const text: string = name.get_text();
    if (text.trim() === '') {
      name.add_css_class('error');
      return ui.toast(t.entry.nameNeeded);
    }
    const chosen = choices[category.get_selected()];
    void app
      .act((deps, spaceId) =>
        editEntry(deps, spaceId, id, {
          name: text,
          amount: amount.get_text(),
          note: note.get_text(),
          priority: PRIORITIES[pressing.get_selected()] ?? entry.priority,
          // A category that is gone stays the entry's until another is chosen.
          categoryId: at < 0 && chosen?.id === 'other' ? entry.categoryId : (chosen?.id ?? 'other'),
        }),
      )
      .then((done) => {
        if (done === undefined) return ui.toast(t.failure.write);
        ui.nav.pop();
      });
  });
  const bar = new Gtk.Box({ css_classes: ['toolbar'] });
  bar.append(save);
  view.add_bottom_bar(bar);

  return {
    page,
    update() {
      // What is typed is not replaced by a sync; an entry that went away is said.
      if (!app.state().entries.some((e) => e.id === id)) save.set_sensitive(false);
    },
  };
}
