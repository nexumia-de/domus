// Preferences: the style, which space's list is shown and how each is kept in
// step, and joining a space by its invitation link.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { Store } from '@nexumia-de/hospes';
import { KEYS, THEMES, statusText, themeOf } from '@emptio/app/core';
import { applyStyle, joinByLink } from '@nexumia-de/gjs';
import type { Ui } from './context';

export function showPreferences(ui: Ui, store: Store): void {
  const { app, t, n, prefs } = ui;
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

  const spaces = new Adw.PreferencesGroup({
    title: n.preferences.spaces,
    description: n.spacesIntro,
  });
  const state = app.state();
  let first: unknown = null;
  for (const space of state.spaces) {
    const line = new Adw.ActionRow({ use_markup: false });
    line.set_title(space.name);
    line.set_subtitle(statusText(n.status, app.status(space.id), ui.now(), true));
    const choose = new Gtk.CheckButton({
      active: space.id === state.space?.id,
      valign: Gtk.Align.CENTER,
    });
    if (first === null) first = choose;
    else choose.set_group(first);
    choose.connect('toggled', () => {
      if (choose.get_active() && space.id !== app.state().space?.id) void app.choose(space.id);
    });
    line.add_prefix(choose);
    line.set_activatable_widget(choose);
    spaces.add(line);
  }
  page.add(spaces);

  const join = new Adw.PreferencesGroup({ title: n.join.title, description: n.join.description });
  const link = new Adw.EntryRow({ title: n.join.link, show_apply_button: true });
  const token = new Adw.PasswordEntryRow({ title: n.join.token });
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

  dialog.add(page);
  dialog.present(ui.window);
}
