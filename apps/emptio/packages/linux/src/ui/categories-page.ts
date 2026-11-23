// The categories of the shown space: a switch shows or hides a starting one,
// the name is edited in place, an own one can be removed, and a new one added.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  addCategory,
  categoriesOf,
  removeCategory,
  renameCategory,
  setCategoryHidden,
  type Category,
} from '@emptio/app/core';
import { editOnTap } from '@nexumia-de/gjs';
import type { Page, Ui } from './context';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function categoriesPage(ui: Ui): Page {
  const { app, t } = ui;
  const view = new Adw.ToolbarView();
  view.add_top_bar(new Adw.HeaderBar());
  const page = new Adw.NavigationPage({ title: t.categories.title, child: view });
  const body = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 18,
    margin_top: 12,
    margin_bottom: 24,
    margin_start: 12,
    margin_end: 12,
  });
  view.set_content(
    new Gtk.ScrolledWindow({
      hscrollbar_policy: Gtk.PolicyType.NEVER,
      child: new Adw.Clamp({ maximum_size: 600, child: body }),
    }),
  );
  const failed = (done: unknown): void => {
    if (done === undefined) ui.toast(t.failure.write);
  };

  function row(category: Category): any {
    // A drag that starts on a name scrolls the list; only a tap edits it.
    const line = editOnTap(
      new Adw.EntryRow({
        title: category.hidden ? `${t.entry.name} (${t.categories.hidden})` : t.entry.name,
        text: category.name,
        show_apply_button: true,
      }),
    );
    line.connect('apply', () => {
      const text: string = line.get_text();
      void app
        .act((deps, spaceId) =>
          renameCategory(deps, spaceId, category.id, text, category.starting).then(() => true),
        )
        .then(failed);
    });
    if (category.id === 'other') return line;
    if (category.starting) {
      const shown = new Gtk.Switch({
        active: !category.hidden,
        valign: Gtk.Align.CENTER,
        tooltip_text: category.hidden ? t.categories.show : t.categories.hide,
      });
      shown.update_property(
        [Gtk.AccessibleProperty.LABEL],
        [`${category.name}: ${t.categories.show}`],
      );
      shown.connect('notify::active', () => {
        const hidden = !shown.get_active();
        void app
          .act((deps, spaceId) =>
            setCategoryHidden(deps, spaceId, category.id, hidden).then(() => true),
          )
          .then(failed);
      });
      line.add_suffix(shown);
    } else {
      const remove = new Gtk.Button({
        icon_name: 'user-trash-symbolic',
        valign: Gtk.Align.CENTER,
        tooltip_text: t.categories.remove,
        css_classes: ['flat', 'emptio-target'],
      });
      remove.update_property(
        [Gtk.AccessibleProperty.LABEL],
        [`${category.name}: ${t.categories.remove}`],
      );
      remove.connect('clicked', () => {
        void app
          .act((deps, spaceId) => removeCategory(deps, spaceId, category.id).then(() => true))
          .then((done) => {
            if (done === undefined) return ui.toast(t.failure.write);
            ui.toast(t.categories.removed(category.name));
          });
      });
      line.add_suffix(remove);
    }
    return line;
  }

  let shown = '';
  function update(): void {
    const categories = categoriesOf(app.state().changes, ui.lang, t.categories.unnamed);
    const signature = JSON.stringify(categories);
    if (signature === shown) return;
    shown = signature;
    for (let child = body.get_first_child(); child !== null; child = body.get_first_child()) {
      body.remove(child);
    }
    const group = new Adw.PreferencesGroup({ description: t.categories.intro });
    for (const category of categories) group.add(row(category));
    body.append(group);

    const fresh = editOnTap(
      new Adw.EntryRow({ title: t.categories.addLabel, show_apply_button: true }),
    );
    fresh.connect('apply', () => {
      const text: string = fresh.get_text();
      void app.act((deps, spaceId) => addCategory(deps, spaceId, text)).then(failed);
    });
    const adding = new Adw.PreferencesGroup();
    adding.add(fresh);
    body.append(adding);
  }

  update();
  return { page, update };
}
