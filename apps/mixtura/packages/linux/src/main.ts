// The native app: GTK 4 and libadwaita on GJS, the same drinks, stock and balance as the
// web app, from the same engine, built-in data and sync (docs/native-linux.md).
import Adw from 'gi://Adw?version=1';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import { exit, programArgs } from 'system';
import { adapterFor, createFileStore } from '@nexumia-de/hospes';
import {
  addStyle,
  applyStyle,
  filePrefs,
  gioFiles,
  installWebPlatform,
  randomBytes,
  soupFetch,
} from '@nexumia-de/gjs';
import type { DisplaySystem } from '@mixtura/engine';
import { PREFS, createSession } from './session';
import { textsDe, textsEn } from './strings';
import type { Page, Ui } from './ui/context';
import { drinksPage } from './ui/drinks-page';
import { STYLES, UNIT_SYSTEMS, choiceOf, showPreferences } from './ui/preferences';

declare const __APP_ID__: string;
declare const __VERSION__: string;
declare const __GITHUB_API__: string;
declare const __SEED__: unknown;

installWebPlatform(randomBytes);

const lang = /^de([_.@-]|$)/.test(GLib.get_language_names()[0] ?? '') ? 'de' : 'en';
const t = lang === 'de' ? textsDe : textsEn;

// MIXTURA_DATA_DIR is for checks and screenshots: a folder of recorded data, never the person's.
const folder =
  GLib.getenv('MIXTURA_DATA_DIR') ?? GLib.build_filenamev([GLib.get_user_data_dir(), 'mixtura']);
const files = gioFiles(folder);
const store = createFileStore(files);

const application = new Adw.Application({
  application_id: __APP_ID__,
  flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
});

// The app's whole stylesheet: its own accent colour (the same brown as the web app's, white
// on it) and controls a finger taps at least 44 px high (the toolkit's rules). libadwaita
// draws buttons and fields lower than that.
const STYLE = `
@define-color accent_bg_color #9a4a12;
@define-color accent_fg_color #ffffff;
* { --accent-bg-color: #9a4a12; --accent-fg-color: #ffffff; }
.mixtura-target { min-height: 44px; min-width: 44px; }
`;

application.connect('activate', () => {
  const open = application.get_active_window();
  if (open) return open.present();
  addStyle(STYLE);

  const prefs = filePrefs(files);
  applyStyle(choiceOf(STYLES, prefs.get(PREFS.style)));
  const now = (): string => new Date().toISOString();
  const fetch = soupFetch(`DrinkBuilder/${__VERSION__}`);
  const monitor = Gio.NetworkMonitor.get_default();
  const isOnline = (): boolean => monitor.get_network_available();
  const session = createSession({
    store,
    seed: __SEED__,
    now,
    prefs,
    names: { home: t.preferences.homeSpace, unnamed: t.preferences.unnamedSpace },
    adapter: (storage) => adapterFor(storage, { apiBase: __GITHUB_API__, fetch, online: isOnline }),
    isOnline,
  });
  const model = session.model();

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
  window.connect('close-request', () => {
    session.stop();
    return false;
  });
  if (model === null) {
    // The built-in data is damaged: say so; there is nothing to show without it.
    const view = new Adw.ToolbarView({
      content: new Adw.StatusPage({ icon_name: 'dialog-error-symbolic', title: t.failure.seed }),
    });
    view.add_top_bar(new Adw.HeaderBar());
    nav.add(new Adw.NavigationPage({ title: t.appName, tag: 'drinks', child: view }));
    window.present();
    return;
  }

  /** The pages that are shown or under the shown one; each redraws on a change. */
  const pages = new Set<Page>();
  const ui: Ui = {
    session,
    model,
    t,
    prefs,
    now,
    nav,
    push(made) {
      pages.add(made);
      nav.push(made.page);
    },
    window,
    units: () => choiceOf(UNIT_SYSTEMS, prefs.get(PREFS.units)) as DisplaySystem,
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
  menu.append(t.menu.preferences, 'app.preferences');
  menu.append(t.menu.about, 'app.about');
  const action = (name: string, run: () => void): void => {
    const made = new Gio.SimpleAction({ name });
    made.connect('activate', run);
    application.add_action(made);
  };
  action('preferences', () => showPreferences(ui, store));
  action('about', () => {
    const about = new Adw.AboutDialog({
      application_name: t.appName,
      application_icon: __APP_ID__,
      version: __VERSION__,
      developer_name: 'nexumia',
      comments: t.about.comments,
      license_type: Gtk.License.AGPL_3_0,
      website: 'https://github.com/suitably/domus',
      issue_url: 'https://github.com/suitably/domus/issues',
    });
    about.add_link(t.about.support, 'https://liberapay.com/suitably');
    // The recipes and ingredients are Bar Assistant's public data (MIT): its notice is shown.
    if (model.attribution) {
      about.add_legal_section(t.about.data, null, Gtk.License.CUSTOM, model.attribution.notice);
    }
    about.present(window);
  });

  const list = drinksPage(ui, menu);
  pages.add(list);
  nav.add(list.page);
  nav.connect('popped', (_view: unknown, gone: unknown) => {
    for (const made of pages) if (made.page === gone) pages.delete(made);
  });
  session.subscribe(() => {
    for (const made of pages) made.update();
  });
  // The window came to the front or the network is back: read again and sync.
  window.connect('notify::is-active', () => {
    if (window.is_active) session.wake();
  });
  monitor.connect('network-changed', () => {
    if (isOnline()) session.wake();
  });
  window.present();
  // No text field has the focus when the window opens, so no keyboard covers the list.
  window.set_focus(null);
  void session.load();
});

exit(application.run([programArgs[0] ?? 'mixtura', ...programArgs.slice(1)]));
