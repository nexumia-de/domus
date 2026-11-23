// Preferences: the style and the units, which space's bottles are shown and how each is
// kept in step, leaving and creating a space (the shared group of `@nexumia-de/gjs`), and
// joining a space by its invitation link.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  applyStyle,
  editOnTap,
  joinByLink,
  spacesGroup,
  type CreateDeps,
  type Style,
} from '@nexumia-de/gjs';
import { statusText, type Store } from '@nexumia-de/hospes';
import { PREFS } from '../session';
import type { Ui } from './context';

export const STYLES: readonly Style[] = ['system', 'light', 'dark'];
export const UNIT_SYSTEMS = ['metric', 'us', 'imperial'] as const;

/** The stored choice, or the first when it is none of the known ones. */
export function choiceOf<T extends string>(list: readonly T[], value: string | null): T {
  return list.find((item) => item === value) ?? (list[0] as T);
}

export function showPreferences(ui: Ui, store: Store, setup: CreateDeps): void {
  const { session, t, prefs } = ui;
  const p = t.preferences;
  const dialog = new Adw.PreferencesDialog({ title: t.menu.preferences });
  const page = new Adw.PreferencesPage();

  const look = new Adw.PreferencesGroup({ title: p.appearance });
  const style = new Adw.ComboRow({
    title: p.style,
    model: Gtk.StringList.new(STYLES.map((item) => p.styles[item])),
    selected: STYLES.indexOf(choiceOf(STYLES, prefs.get(PREFS.style))),
  });
  style.connect('notify::selected', () => {
    const chosen = STYLES[style.get_selected()] ?? 'system';
    prefs.set(PREFS.style, chosen);
    applyStyle(chosen);
  });
  look.add(style);
  const units = new Adw.ComboRow({
    title: p.units,
    model: Gtk.StringList.new(UNIT_SYSTEMS.map((item) => p.unitSystems[item])),
    selected: UNIT_SYSTEMS.indexOf(choiceOf(UNIT_SYSTEMS, prefs.get(PREFS.units))),
  });
  // Pages that are open show the old units until they are opened again.
  units.connect('notify::selected', () =>
    prefs.set(PREFS.units, UNIT_SYSTEMS[units.get_selected()] ?? 'metric'),
  );
  look.add(units);
  page.add(look);

  page.add(
    spacesGroup({
      host: session,
      store,
      setup,
      texts: t,
      intro: p.spacesIntro,
      subtitle: (space) => statusText(t.status, session.status(space.id), ui.now(), true),
      dialog,
      toast: (text) => ui.toast(text),
      targetClass: 'mixtura-target',
    }),
  );

  const join = new Adw.PreferencesGroup({ title: t.join.title, description: t.join.description });
  const link = editOnTap(new Adw.EntryRow({ title: t.join.link, show_apply_button: true }));
  const token = editOnTap(new Adw.PasswordEntryRow({ title: t.join.token }));
  link.connect('apply', () => {
    void joinByLink(store, link.get_text(), token.get_text()).then(
      (done) => {
        if (!done.ok) return dialog.add_toast(new Adw.Toast({ title: t.join.errors[done.error] }));
        ui.toast(t.join.joined(done.name ?? p.unnamedSpace));
        dialog.close();
        // The joined space is shown, and its loop starts with the next look.
        void session.choose(done.id).then(() => session.wake());
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
