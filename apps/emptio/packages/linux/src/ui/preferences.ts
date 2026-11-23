// Preferences: the style, which space's list is shown and how each is kept in
// step, leaving and creating a space (the shared group of `@nexumia-de/gjs`),
// joining a space by its invitation link, and the KitchenOwl list of the shown
// space.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { Store } from '@nexumia-de/hospes';
import { KEYS, THEMES, statusText, themeOf } from '@emptio/app/core';
import { applyStyle, editOnTap, joinByLink, spacesGroup, type CreateDeps } from '@nexumia-de/gjs';
import type { Ui } from './context';
import { kitchenowlGroup } from './kitchenowl-group';

export function showPreferences(ui: Ui, store: Store, setup: CreateDeps): void {
  const { app, n, prefs } = ui;
  const dialog = new Adw.PreferencesDialog({ title: n.menu.preferences });
  const page = new Adw.PreferencesPage();

  const look = new Adw.PreferencesGroup({ title: n.preferences.appearance });
  const style = new Adw.ComboRow({
    title: n.preferences.style,
    model: Gtk.StringList.new(THEMES.map((theme) => n.preferences.styles[theme])),
    selected: THEMES.indexOf(themeOf(prefs.get(KEYS.theme))),
  });
  style.connect('notify::selected', () => {
    const theme = THEMES[style.get_selected()] ?? 'system';
    prefs.set(KEYS.theme, theme);
    applyStyle(theme);
  });
  look.add(style);
  page.add(look);

  page.add(
    spacesGroup({
      host: app,
      store,
      setup,
      texts: n,
      intro: n.spacesIntro,
      subtitle: (space) => statusText(n.status, app.status(space.id), ui.now(), true),
      dialog,
      toast: (text) => ui.toast(text),
      targetClass: 'emptio-target',
    }),
  );

  // Whether the app syncs by itself (docs/behaviour.md#sync); the choice of this device.
  const syncing = new Adw.PreferencesGroup({ title: ui.t.settings.sync });
  const auto = new Adw.SwitchRow({
    title: ui.t.settings.autoSync,
    subtitle: ui.t.settings.autoSyncHint,
    active: app.autoSync(),
  });
  auto.connect('notify::active', () => {
    if (auto.get_active() === app.autoSync()) return;
    if (!app.setAutoSync(auto.get_active())) {
      dialog.add_toast(new Adw.Toast({ title: ui.t.settings.notKept }));
    }
  });
  syncing.add(auto);
  page.add(syncing);

  const join = new Adw.PreferencesGroup({ title: n.join.title, description: n.join.description });
  const link = editOnTap(new Adw.EntryRow({ title: n.join.link, show_apply_button: true }));
  const token = editOnTap(new Adw.PasswordEntryRow({ title: n.join.token }));
  link.connect('apply', () => {
    void joinByLink(store, link.get_text(), token.get_text()).then(
      (done) => {
        if (!done.ok) return dialog.add_toast(new Adw.Toast({ title: n.join.errors[done.error] }));
        ui.toast(n.join.joined(done.name ?? n.preferences.unnamedSpace));
        dialog.close();
        // The joined space is shown, and its loop starts with the next look.
        void app.choose(done.id).then(() => app.wake());
      },
      () => dialog.add_toast(new Adw.Toast({ title: n.failure.write })),
    );
  });
  join.add(link);
  join.add(token);
  page.add(join);
  page.add(kitchenowlGroup(ui, dialog));

  dialog.add(page);
  dialog.present(ui.window);
}
