// Preferences: the style, which space's list is shown and how each is kept in
// step, and joining a space by its invitation link.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { Store } from '@nexumia-de/hospes';
import { KEYS, THEMES, statusText, themeOf, type Theme } from '@emptio/app/core';
import { joinByLink } from '../join';
import type { NativeStrings } from '../strings';
import type { Ui } from './context';

/** Follow System, Light or Dark, as the person chose and the prefs keep it. */
export function applyStyle(theme: Theme): void {
  const scheme =
    theme === 'light'
      ? Adw.ColorScheme.FORCE_LIGHT
      : theme === 'dark'
        ? Adw.ColorScheme.FORCE_DARK
        : Adw.ColorScheme.DEFAULT;
  Adw.StyleManager.get_default().set_color_scheme(scheme);
}

export function showPreferences(ui: Ui, n: NativeStrings, store: Store): void {
  const { app, t, prefs } = ui;
  const dialog = new Adw.PreferencesDialog({ title: n.menu.preferences });
  const page = new Adw.PreferencesPage();

  const look = new Adw.PreferencesGroup({ title: n.appearance });
  const style = new Adw.ComboRow({
    title: n.theme,
    model: Gtk.StringList.new(THEMES.map((theme) => t.settings.themes[theme])),
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
    title: n.spaces,
    description: n.spacesIntro,
  });
  const state = app.state();
  let first: unknown = null;
  for (const space of state.spaces) {
    const line = new Adw.ActionRow({
      title: space.name,
      subtitle: statusText(t.status, app.status(space.id), ui.now(), true),
      use_markup: false,
    });
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
        ui.toast(n.join.joined(done.name ?? t.space.unnamed));
        dialog.close();
        // The joined space is shown, and its loop starts with the next look.
        void app.choose(done.id).then(() => app.wake());
      },
      () => dialog.add_toast(new Adw.Toast({ title: t.failure.write })),
    );
  });
  join.add(link);
  join.add(token);
  page.add(join);

  dialog.add(page);
  dialog.present(ui.window);
}
