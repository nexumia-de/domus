// The native app: GTK 4 and libadwaita on GJS, the same classics, amounts, steps and finder as
// the web app, from the same engine, built-in content and sync (docs/native-linux.md).
// The language module comes first: the web code reads the device's language when it loads.
import { deviceLang } from '@nexumia-de/gjs/language';
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
import { displayName, strings } from '@culina/app/core';
import { PREFS, createSession } from './session';
import { textsDe, textsEn } from './strings';
import type { Page, Ui } from './ui/context';
import { STYLES, choiceOf, showPreferences } from './ui/preferences';
import { startPage } from './ui/start-page';

declare const __APP_ID__: string;
declare const __VERSION__: string;
declare const __GITHUB_API__: string;
declare const __CONTENT__: unknown;
declare const __CATALOGUE__: unknown;

installWebPlatform(randomBytes);

const lang = deviceLang();
const t = lang === 'de' ? textsDe : textsEn;

// CULINA_DATA_DIR is for checks and screenshots: a folder of recorded data, never the person's.
const folder =
  GLib.getenv('CULINA_DATA_DIR') ?? GLib.build_filenamev([GLib.get_user_data_dir(), 'culina']);
const files = gioFiles(folder);
const store = createFileStore(files);

const application = new Adw.Application({
  application_id: __APP_ID__,
  flags: Gio.ApplicationFlags.DEFAULT_FLAGS,
});

// The app's whole stylesheet: its own accent colour (Beet, the same as the web app's, white on
// it) and controls a finger taps at least 44 px high (the toolkit's rules); Back and Next while
// cooking are 56 px.
const STYLE = `
@define-color accent_bg_color #a02b45;
@define-color accent_fg_color #ffffff;
* { --accent-bg-color: #a02b45; --accent-fg-color: #ffffff; }
.culina-target { min-height: 44px; min-width: 44px; }
.culina-big { min-height: 56px; }
`;

application.connect('activate', () => {
  const open = application.get_active_window();
  if (open) return open.present();
  addStyle(STYLE);

  const prefs = filePrefs(files);
  applyStyle(choiceOf(STYLES, prefs.get(PREFS.style)));
  const now = (): string => new Date().toISOString();
  const today = (): string => {
    const d = new Date();
    const two = (n: number): string => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
  };
  const fetch = soupFetch(`CooksNotebook/${__VERSION__}`);
  const monitor = Gio.NetworkMonitor.get_default();
  const isOnline = (): boolean => monitor.get_network_available();
  const session = createSession({
    store,
    content: __CONTENT__,
    catalogue: __CATALOGUE__,
    lang,
    today,
    now,
    prefs,
    names: { home: t.preferences.homeSpace, unnamed: t.preferences.unnamedSpace },
    adapter: (storage) => adapterFor(storage, { apiBase: __GITHUB_API__, fetch, online: isOnline }),
    isOnline,
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
  window.connect('close-request', () => {
    session.stop();
    return false;
  });

  /** The pages that are shown or under the shown one; each redraws on a change. */
  const pages = new Set<Page>();
  const ui: Ui = {
    session,
    t,
    s: strings,
    lang,
    prefs,
    now,
    nav,
    push(made) {
      pages.add(made);
      nav.push(made.page);
    },
    window,
    toast(text, undo) {
      const toast = new Adw.Toast({ title: text, use_markup: false, timeout: undo ? 10 : 4 });
      if (undo) {
        toast.set_button_label(undo.label);
        toast.connect('button-clicked', undo.run);
      }
      toasts.add_toast(toast);
    },
    keepAwake(reason) {
      const cookie = application.inhibit(window, Gtk.ApplicationInhibitFlags.IDLE, reason);
      // A session without an inhibit service (Broadway) gives 0: there is nothing to undo.
      return () => (cookie > 0 ? application.uninhibit(cookie) : undefined);
    },
    nameOf(id) {
      const entry = session.catalogue().get(id);
      return entry === undefined ? id : displayName(entry, lang);
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
    about.add_link(t.support, 'https://liberapay.com/suitably');
    // The data is not ours alone: its sources and licences are named here and on each dish.
    about.add_legal_section(t.about.data, null, Gtk.License.CUSTOM, t.about.dataNotice);
    about.present(window);
  });

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

  const start = startPage(ui, menu);
  pages.add(start);
  nav.add(start.page);
  window.present();
  // No text field has the focus when the window opens, so no keyboard covers the list.
  window.set_focus(null);
  void session.open().then(() => session.load());
});

exit(application.run([programArgs[0] ?? 'culina', ...programArgs.slice(1)]));
