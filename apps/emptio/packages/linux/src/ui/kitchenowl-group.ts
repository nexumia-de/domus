// The KitchenOwl group of the preferences (../../docs/kitchenowl.md#setting-up):
// the same steps as the web app's settings, with the same texts and the same
// core: check address and token, pick the list, connect; or see the status,
// sync now, disconnect with Undo.
import Adw from 'gi://Adw?version=1';
import Gtk from 'gi://Gtk?version=4.0';
import {
  KitchenowlError,
  ago,
  connectKitchenowl,
  disconnectKitchenowl,
  instanceUrl,
  type KitchenowlFailure,
  type Named,
} from '@emptio/app/core';
import { editOnTap } from '@nexumia-de/gjs';
import type { Ui } from './context';

/* eslint-disable @typescript-eslint/no-explicit-any */

/** A row that acts when activated; libadwaita 1.5 has no button row. */
function actionRow(title: string, visible = true): any {
  const row = new Adw.ActionRow({ title, activatable: true, visible, use_markup: false });
  row.add_suffix(new Gtk.Image({ icon_name: 'go-next-symbolic' }));
  return row;
}

export function kitchenowlGroup(ui: Ui, dialog: any): any {
  const { app, t } = ui;
  const k = t.kitchenowl;
  const space = app.state().space;
  const group = new Adw.PreferencesGroup({
    title: k.title,
    description: k.intro(space?.name ?? ''),
  });
  const say = (text: string): void =>
    dialog.add_toast(new Adw.Toast({ title: text, use_markup: false }));
  const failed = (error: unknown): void => {
    const failure: KitchenowlFailure = error instanceof KitchenowlError ? error.failure : 'refused';
    say(k.status.failed(k.failures[failure]));
  };

  const config = app.state().kitchenowl;
  if (config !== undefined && space !== undefined) {
    const now = app.kitchenowl(space.id);
    const row = new Adw.ActionRow({ use_markup: false });
    row.set_title(k.connected(config.listName ?? `#${config.listId}`, config.url));
    row.set_subtitle(
      now === undefined
        ? k.status.never
        : now.last.state === 'failed'
          ? k.status.failed(k.failures[now.last.failure])
          : now.syncedAt === undefined
            ? k.status.never
            : k.status.inStep(ago(t.status, now.syncedAt, ui.now())),
    );
    group.add(row);
    const sync = actionRow(k.syncNow);
    sync.connect('activated', () => {
      void app.syncNow().then(() => dialog.close());
    });
    group.add(sync);
    const disconnect = actionRow(k.disconnect);
    disconnect.add_css_class('error');
    disconnect.connect('activated', () => {
      void app
        .act((deps, id) => disconnectKitchenowl(deps, id))
        .then(() => {
          dialog.close();
          ui.toast(k.disconnected, {
            label: k.undo,
            run: () => void app.act((deps, id) => connectKitchenowl(deps, id, config)),
          });
        });
    });
    group.add(disconnect);
    return group;
  }

  const address = editOnTap(
    new Adw.EntryRow({ title: k.address, input_purpose: Gtk.InputPurpose.URL }),
  );
  const token = editOnTap(new Adw.PasswordEntryRow({ title: k.token }));
  const check = actionRow(k.check);
  const households = new Adw.ComboRow({ title: k.household, visible: false });
  const lists = new Adw.ComboRow({ title: k.list, visible: false });
  const connect = actionRow(k.connect, false);
  connect.add_css_class('accent');
  for (const row of [address, token, check, households, lists, connect]) group.add(row);

  let checked: { url: string; token: string; households: Named[]; lists: Named[] } | null = null;
  const forget = (): void => {
    checked = null;
    for (const row of [households, lists, connect]) row.set_visible(false);
  };
  address.connect('changed', forget);
  token.connect('changed', forget);

  const fill = (row: any, items: Named[]): void => {
    row.set_model(Gtk.StringList.new(items.map((i) => i.name)));
    row.set_selected(0);
  };

  async function showLists(): Promise<void> {
    if (checked === null) return;
    const client = app.kitchenowlClient(checked.url, checked.token);
    const household = checked.households[households.get_selected()];
    if (client === null || household === undefined) return;
    try {
      checked.lists = await client.lists(household.id);
      fill(lists, checked.lists);
      connect.set_visible(checked.lists.length > 0);
      if (checked.lists.length === 0) say(k.noLists);
    } catch (error) {
      failed(error);
    }
  }
  households.connect('notify::selected', () => void showLists());

  check.connect('activated', () => {
    const url = instanceUrl(address.get_text());
    if (url === null) return say(k.badAddress);
    const typed = token.get_text().trim();
    const client = app.kitchenowlClient(url, typed);
    if (client === null || typed === '') return;
    check.set_sensitive(false);
    void client
      .households()
      .then(
        async (found) => {
          checked = { url, token: typed, households: found, lists: [] };
          fill(households, found);
          households.set_visible(true);
          lists.set_visible(true);
          await showLists();
        },
        (error: unknown) => {
          forget();
          failed(error);
        },
      )
      .finally(() => check.set_sensitive(true));
  });

  connect.connect('activated', () => {
    if (checked === null) return;
    const household = checked.households[households.get_selected()];
    const list = checked.lists[lists.get_selected()];
    if (household === undefined || list === undefined) return;
    const chosen = {
      url: checked.url,
      token: checked.token,
      householdId: household.id,
      listId: list.id,
      householdName: household.name,
      listName: list.name,
    };
    void app
      .act((deps, id) => connectKitchenowl(deps, id, chosen))
      .then(() => {
        dialog.close();
        ui.toast(k.connected(list.name, chosen.url));
        return app.syncNow();
      });
  });
  return group;
}
