// The native app: GTK 4 and libadwaita on GJS, the same list, actions, texts
// and sync as the web app (docs/native-linux.md).
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { exit, programArgs } from 'system';
import {
  adapterFor,
  createFileStore,
  feedbackDe,
  feedbackEn,
  testGithub,
} from '@nexumia-de/hospes';
import {
  addStyle,
  applyStyle,
  filePrefs,
  gioFiles,
  type CreateDeps,
  installWebPlatform,
  randomBytes,
  installReport,
  reportIssueUrl,
  soupFetch,
} from '@nexumia-de/gjs';
import { KEYS, createApp, stringsDe, stringsEn, themeOf, type Lang } from '@emptio/app/core';
import { nativeDe, nativeEn } from './strings';
import { categoriesPage } from './ui/categories-page';
import type { Page, Ui } from './ui/context';
import { listPage } from './ui/list-page';
import { showPreferences } from './ui/preferences';

declare const __APP_ID__: string;
declare const __VERSION__: string;
declare const __GITHUB_API__: string;

installWebPlatform(randomBytes);

const lang: Lang = /^de([_.@-]|$)/.test(GLib.get_language_names()[0] ?? '') ? 'de' : 'en';
const t = lang === 'de' ? stringsDe : stringsEn;
const feedback = lang === 'de' ? feedbackDe : feedbackEn;
const n = lang === 'de' ? nativeDe : nativeEn;

// EMPTIO_DATA_DIR is for checks and screenshots: a folder of recorded data, never the person's.
const folder =
  GLib.getenv('EMPTIO_DATA_DIR') ?? GLib.build_filenamev([GLib.get_user_data_dir(), 'emptio']);
const files = gioFiles(folder);
const store = createFileStore(files);

/** This app in the issue forms' `app` field (docs/feedback.md). */
const REPORT_APP = 'Shopping List';

const application = new Adw.Application({
  application_id: __APP_ID__,
  flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
});

// The app's whole stylesheet: controls a finger taps are at least 44 px (the toolkit's
// rule); libadwaita draws buttons and fields lower than that.
const STYLE = '.emptio-target { min-height: 44px; min-width: 44px; }';

application.connect('activate', () => {
  const open = application.get_active_window();
  if (open) return open.present();
  addStyle(STYLE);

  const prefs = filePrefs(files);
  applyStyle(themeOf(prefs.get(KEYS.theme)));
  const now = (): string => new Date().toISOString();
  const fetch = soupFetch(`Emptio/${__VERSION__}`);
  const monitor = Gio.NetworkMonitor.get_default();
  const isOnline = (): boolean => monitor.get_network_available();
  const adapter: CreateDeps['adapter'] = (storage) =>
    adapterFor(storage, { apiBase: __GITHUB_API__, fetch, online: isOnline });
  // What creating a space needs; the token goes to the compiled-in GitHub address only.
  const setup: CreateDeps = {
    store,
    now,
    adapter,
    testGithub: (repository, token) =>
      testGithub({ repository, token, apiBase: __GITHUB_API__, fetch, online: isOnline }),
  };
  const app = createApp({
    store,
    now,
    newId: () => `e-${crypto.randomUUID()}`,
    prefs,
    names: { home: n.preferences.homeSpace, unnamed: n.preferences.unnamedSpace },
    adapter,
    isOnline,
    // Only to the KitchenOwl server a space was connected to (docs/kitchenowl.md).
    fetch: (url, init) => fetch(url, init),
  });

  const nav = new Adw.NavigationView();
  const toasts = new Adw.ToastOverlay({ child: nav });
  const window = new Adw.ApplicationWindow({
    application,
    title: t.appName,
    default_width: 420,
    default_height: 720,
    width_request: 360,
    height_request: 294,
    content: toasts,
  });
  const ui: Ui = {
    app,
    t,
    n,
    lang,
    prefs,
    now,
    nav,
    window,
    toast(text, undo) {
      const toast = new Adw.Toast({ title: text, use_markup: false, timeout: undo ? 10 : 4 });
      if (undo) {
        toast.set_button_label(undo.label);
        toast.connect('button-clicked', undo.run);
      }
      toasts.add_toast(toast);
    },
  };

  const menu = new Gio.Menu();
  menu.append(t.settings.syncNow, 'app.sync');
  menu.append(n.menu.categories, 'app.categories');
  menu.append(n.menu.preferences, 'app.preferences');
  menu.append(feedback.open, 'app.report-problem');
  menu.append(n.menu.about, 'app.about');
  installReport(application, {
    texts: feedback,
    appName: t.appName,
    app: REPORT_APP,
    version: __VERSION__,
    fetch,
  });
  /** The pages that are shown or under the shown one; each redraws on a change. */
  const pages = new Set<Page>();
  const push = (made: Page): void => {
    pages.add(made);
    nav.push(made.page);
  };
  nav.connect('popped', (_view: unknown, gone: unknown) => {
    for (const made of pages) if (made.page === gone) pages.delete(made);
  });
  const action = (name: string, run: () => void): void => {
    const made = new Gio.SimpleAction({ name });
    made.connect('activate', run);
    application.add_action(made);
  };
  action('sync', () => void app.syncNow());
  application.set_accels_for_action('app.sync', ['<Control>r']);
  action('categories', () => push(categoriesPage(ui)));
  action('preferences', () => showPreferences(ui, store, setup));
  action('about', () => {
    const about = new Adw.AboutDialog({
      application_name: t.appName,
      application_icon: __APP_ID__,
      version: __VERSION__,
      developer_name: 'nexumia',
      comments: n.comments,
      license_type: Gtk.License.AGPL_3_0,
      website: 'https://github.com/nexumia-de/domus',
      issue_url: reportIssueUrl(REPORT_APP, __VERSION__),
    });
    about.add_link(n.support, 'https://liberapay.com/suitably');
    about.present(window);
  });

  const list = listPage(ui, menu);
  pages.add(list);
  nav.add(list.page);
  app.subscribe(() => {
    for (const made of pages) made.update();
  });
  // The window came to the front or the network is back: read again and sync.
  window.connect('notify::is-active', () => {
    if (window.is_active) app.wake();
  });
  monitor.connect('network-changed', () => {
    if (isOnline()) app.wake();
  });
  window.connect('close-request', () => {
    app.stop();
    return false;
  });
  window.present();
  // No text field has the focus when the window opens, so no keyboard covers the list.
  window.set_focus(null);
  void app.load();
});

exit(application.run([programArgs[0] ?? 'emptio', ...programArgs.slice(1)]));
