// The Spaces group of the native apps' preferences: which space is shown, leaving a space, and
// creating one (docs/platform.md#spaces-in-the-preferences). Leaving is the Household app's
// "Remove from this device": the space is taken out of this app's store with everything the app
// keeps of it; the files in the storage stay. Creating is the host's `createSpace`, by way of
// `createFromForm` (src/create.ts).
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import type { SpaceView, Store } from '@nexumia-de/hospes';
import { STORAGE_KINDS, createFromForm, type CreateDeps, type CreateForm } from './create';
import { editOnTap } from './rows';
import type { SharedTexts } from './texts';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** What the group needs of an app's running state (Emptio's app, Mixtura's and Culina's session). */
export interface SpacesHost {
  state(): { spaces: readonly SpaceView[]; space?: SpaceView };
  choose(spaceId: string): Promise<void>;
  /** Reads the spaces again and lets the loops follow. */
  wake(): void;
}

export interface SpacesGroupOptions {
  host: SpacesHost;
  store: Store;
  /** What creating a space needs: the store, the clock, the adapter and the look at GitHub. */
  setup: CreateDeps;
  texts: SharedTexts;
  /** The group's description: what a space holds in this app. */
  intro: string;
  /** The line under a space's name (its sync status). */
  subtitle: (space: SpaceView) => string;
  /** The preferences dialog the group is in. */
  dialog: any;
  /** A toast in the main window, for what is said after the dialog closed. */
  toast: (text: string) => void;
  /** The app's CSS class for a control a finger taps (at least 44 px). */
  targetClass: string;
}

const confirm = (
  parent: any,
  heading: string,
  body: string,
  answers: { cancel: string; go: string; destructive: boolean },
  run: () => void,
): void => {
  const alert = new Adw.AlertDialog({ heading, body });
  alert.add_response('cancel', answers.cancel);
  alert.add_response('go', answers.go);
  alert.set_response_appearance(
    'go',
    answers.destructive ? Adw.ResponseAppearance.DESTRUCTIVE : Adw.ResponseAppearance.SUGGESTED,
  );
  alert.set_default_response('cancel');
  alert.set_close_response('cancel');
  alert.connect('response', (_alert: unknown, response: string) => {
    if (response === 'go') run();
  });
  alert.present(parent);
};

function leave(o: SpacesGroupOptions, space: SpaceView): void {
  const { texts: t, dialog } = o;
  confirm(
    dialog,
    t.leave.title(space.name),
    space.deviceOnly ? t.leave.bodyDeviceOnly : t.leave.body,
    { cancel: t.cancel, go: t.leave.confirm, destructive: true },
    () => {
      void o.store.removeSpace(space.id).then(
        () => {
          dialog.close();
          o.toast(t.leave.left(space.name));
          // The app reads its spaces again; with none left it makes a new one on this device.
          o.host.wake();
        },
        () => dialog.add_toast(new Adw.Toast({ title: t.failure.write })),
      );
    },
  );
}

/** The page pushed onto the preferences dialog to create a space; swiping back leaves it. */
function createPage(o: SpacesGroupOptions): any {
  const { texts: t, dialog } = o;
  const c = t.create;
  const page = new Adw.PreferencesPage({ description: c.description });

  const name = editOnTap(new Adw.EntryRow({ title: c.name, text: c.nameSuggestion }));
  const kind = new Adw.ComboRow({
    title: c.storage,
    model: Gtk.StringList.new(STORAGE_KINDS.map((k) => c.kinds[k])),
  });
  const first = new Adw.PreferencesGroup();
  first.add(name);
  first.add(kind);
  page.add(first);

  const repository = editOnTap(new Adw.EntryRow({ title: c.repository }));
  const token = editOnTap(new Adw.PasswordEntryRow({ title: c.token }));
  const github = new Adw.PreferencesGroup({ description: c.tokenHint });
  github.add(repository);
  github.add(token);
  page.add(github);

  const address = editOnTap(
    new Adw.EntryRow({ title: c.address, input_purpose: Gtk.InputPurpose.URL }),
  );
  const user = editOnTap(new Adw.EntryRow({ title: c.user }));
  const password = editOnTap(new Adw.PasswordEntryRow({ title: c.password }));
  const webdav = new Adw.PreferencesGroup({ description: c.webdavHint, visible: false });
  webdav.add(address);
  webdav.add(user);
  webdav.add(password);
  page.add(webdav);

  kind.connect('notify::selected', () => {
    const isGithub = STORAGE_KINDS[kind.get_selected()] === 'github';
    github.set_visible(isGithub);
    webdav.set_visible(!isGithub);
  });

  const button = new Gtk.Button({
    label: c.button,
    hexpand: true,
    css_classes: ['pill', 'suggested-action', o.targetClass],
  });
  const bar = new Gtk.Box({ css_classes: ['toolbar'] });
  bar.append(button);
  const view = new Adw.ToolbarView({ content: page });
  view.add_top_bar(new Adw.HeaderBar());
  // The button sits at the bottom, within reach of the thumb.
  view.add_bottom_bar(new Adw.Clamp({ maximum_size: 600, child: bar }));
  const navigation = new Adw.NavigationPage({ title: c.title, tag: 'create-space', child: view });

  const form = (): CreateForm => ({
    name: name.get_text(),
    kind: STORAGE_KINDS[kind.get_selected()] ?? 'github',
    repository: repository.get_text(),
    token: token.get_text(),
    address: address.get_text(),
    user: user.get_text(),
    password: password.get_text(),
  });
  const say = (text: string): void => dialog.add_toast(new Adw.Toast({ title: text }));

  const run = (publicAllowed: boolean): void => {
    button.set_sensitive(false);
    button.set_label(c.creating);
    void createFromForm(form(), o.setup, { publicAllowed })
      .then((done) => {
        button.set_sensitive(true);
        button.set_label(c.button);
        if (done.ok) {
          // The secret and the token are in the store now; the fields forget them.
          token.set_text('');
          password.set_text('');
          dialog.close();
          o.toast(c.created(done.name));
          void o.host.choose(done.id).then(() => o.host.wake());
          return;
        }
        if (done.error === 'public') {
          confirm(
            dialog,
            c.publicTitle,
            c.publicBody,
            { cancel: t.cancel, go: c.publicUse, destructive: false },
            () => run(true),
          );
          return;
        }
        if (done.error === 'failed') {
          const failures: Record<string, string> = t.status.failures;
          return say(c.errors.failed(failures[done.failure] ?? t.status.failures.other));
        }
        say(c.errors[done.error]);
      })
      .catch(() => {
        button.set_sensitive(true);
        button.set_label(c.button);
        say(t.failure.write);
      });
  };
  button.connect('clicked', () => run(false));
  return navigation;
}

/** The Spaces group: a row per space to show it or leave it, and a row to create one. */
export function spacesGroup(o: SpacesGroupOptions): any {
  const { texts: t, host } = o;
  const group = new Adw.PreferencesGroup({ title: t.preferences.spaces, description: o.intro });
  const state = host.state();
  let first: unknown = null;
  for (const space of state.spaces) {
    const line = new Adw.ActionRow({ use_markup: false });
    line.set_title(space.name);
    line.set_subtitle(o.subtitle(space));
    const choose = new Gtk.CheckButton({
      active: space.id === state.space?.id,
      valign: Gtk.Align.CENTER,
    });
    if (first === null) first = choose;
    else choose.set_group(first);
    choose.connect('toggled', () => {
      if (choose.get_active() && space.id !== host.state().space?.id) void host.choose(space.id);
    });
    line.add_prefix(choose);
    line.set_activatable_widget(choose);
    const out = new Gtk.Button({
      icon_name: 'user-trash-symbolic',
      valign: Gtk.Align.CENTER,
      tooltip_text: t.leave.button(space.name),
      css_classes: ['flat', o.targetClass],
    });
    out.update_property([Gtk.AccessibleProperty.LABEL], [t.leave.button(space.name)]);
    out.connect('clicked', () => leave(o, space));
    line.add_suffix(out);
    group.add(line);
  }
  const create = new Adw.ActionRow({
    title: t.create.row,
    subtitle: t.create.rowHint,
    activatable: true,
  });
  create.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
  create.connect('activated', () => o.dialog.push_subpage(createPage(o)));
  group.add(create);
  return group;
}
