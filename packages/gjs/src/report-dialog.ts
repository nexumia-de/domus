// The "Report a Problem" dialog of the native apps (docs/feedback.md): the user writes a problem
// or an idea; with a GitHub token it becomes an issue right away, without one GitHub's issue form
// opens in the browser, filled in. Mirrors phosh_toolkit's feedback dialog. Nothing here logs;
// only what the user typed, the app, the version and the device are sent.
import Adw from 'gi://Adw?version=1';
import Gdk from 'gi://Gdk?version=4.0';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk?version=4.0';
import {
  ISSUE_REPOSITORY,
  REPORT_KINDS,
  TOKEN_URL,
  createIssue,
  formUrl,
  issueUrl,
  nativeDevice,
  shortened,
  type FeedbackTexts,
  type Report,
} from '@nexumia-de/hospes';
import { createKeyring, type Keyring } from './keyring';
import { addStyle } from './style';

/** Keyring kind of the user's token. */
export const GITHUB_TOKEN = 'github-token';
/** Set to "memory" in checks and screenshots: the real keyring is never touched. */
export const TEST_KEYRING = 'DOMUS_TEST_KEYRING';

export interface ReportOptions {
  texts: FeedbackTexts;
  /** The visible name, in the dialog's words. */
  appName: string;
  /** One of the issue forms' `app` options: the app's English visible name. */
  app: string;
  version: string;
  fetch: typeof fetch;
  /** Default: the keyring under the app id (`TEST_KEYRING` keeps it in memory). */
  keyring?: Keyring;
  /** For checks; default `https://api.github.com`. */
  apiBase?: string;
}

const device = () => nativeDevice(GLib.getenv('XDG_CURRENT_DESKTOP'));

/** The bug form with app, version and device filled in: for AdwAboutDialog's `issue-url`. */
export function reportIssueUrl(app: string, version: string): string {
  return issueUrl(app, version, device());
}

function launch(window: unknown, url: string): void {
  Gtk.UriLauncher.new(url).launch(window, null, null);
}

let styled = false;

/** What `installReport` uses of an `Adw.Application`. */
interface Application {
  get_application_id(): string;
  get_active_window(): unknown;
  add_action(action: unknown): void;
}

/**
 * Adds the action `app.report-problem` to `application`; it opens the dialog over the active
 * window. Put `(texts.open, 'app.report-problem')` in the main menu next to About.
 */
export function installReport(application: Application, options: ReportOptions): void {
  const keyring =
    options.keyring ??
    createKeyring({
      appId: application.get_application_id(),
      labels: { [GITHUB_TOKEN]: `${options.app} GitHub token` },
      memoryEnv: TEST_KEYRING,
    });
  const action = new Gio.SimpleAction({ name: 'report-problem' });
  action.connect('activate', () => {
    if (!styled) {
      addStyle('.report-target { min-height: 44px; min-width: 44px; }');
      styled = true;
    }
    showReportDialog(application.get_active_window(), { ...options, keyring });
  });
  application.add_action(action);
}

/** Builds and presents the dialog over `window`. */
export function showReportDialog(
  window: unknown,
  options: ReportOptions & { keyring: Keyring },
): void {
  const t = options.texts;
  const { keyring } = options;
  const here = device();
  let sending = false;

  const dialog = new Adw.Dialog({ title: t.title, content_width: 480, content_height: 680 });
  const toolbar = new Adw.ToolbarView();
  toolbar.add_top_bar(new Adw.HeaderBar());
  const banner = new Adw.Banner({ button_label: t.openForm });
  toolbar.add_top_bar(banner);

  const page = new Adw.PreferencesPage();
  const about = new Adw.PreferencesGroup({ description: t.intro(options.appName) });
  const kindRow = new Adw.ComboRow({
    title: t.kind,
    model: Gtk.StringList.new(REPORT_KINDS.map((kind) => t.kinds[kind])),
  });
  const titleRow = new Adw.EntryRow({ title: t.issueTitle });
  about.add(kindRow);
  about.add(titleRow);
  page.add(about);

  const textGroup = new Adw.PreferencesGroup();
  const text = new Gtk.TextView({
    wrap_mode: Gtk.WrapMode.WORD_CHAR,
    accepts_tab: false,
    top_margin: 12,
    bottom_margin: 12,
    left_margin: 12,
    right_margin: 12,
  });
  text.set_size_request(-1, 160);
  textGroup.add(new Gtk.Frame({ child: text }));
  page.add(textGroup);

  const direct = new Adw.PreferencesGroup({ title: t.direct, description: t.directHint });
  const tokenRow = new Adw.PasswordEntryRow({ title: t.token });
  const helpRow = new Adw.ActionRow({
    title: t.createToken,
    subtitle: t.createTokenHint,
    activatable: true,
  });
  helpRow.add_suffix(new Gtk.Image({ icon_name: 'adw-external-link-symbolic' }));
  helpRow.connect('activated', () => launch(dialog.get_root(), TOKEN_URL));
  const savedRow = new Adw.ActionRow({ title: t.tokenSaved, subtitle: t.keptKeyring });
  const forget = new Gtk.Button({ label: t.forget, valign: Gtk.Align.CENTER });
  forget.add_css_class('flat');
  forget.add_css_class('report-target');
  savedRow.add_suffix(forget);
  for (const row of [tokenRow, helpRow, savedRow]) direct.add(row);
  page.add(direct);
  toolbar.set_content(page);

  // Bottom bar, in thumb reach: the main action on the right.
  const bar = new Gtk.Box({
    spacing: 12,
    margin_top: 12,
    margin_bottom: 12,
    margin_start: 12,
    margin_end: 12,
  });
  const formButton = new Gtk.Button({ label: t.openForm, hexpand: true });
  const sendButton = new Gtk.Button({ label: t.send, hexpand: true });
  for (const button of [formButton, sendButton]) {
    button.add_css_class('pill');
    button.add_css_class('report-target');
    bar.append(button);
  }
  toolbar.add_bottom_bar(bar);
  dialog.set_child(toolbar);

  const report = (): Report => {
    const [start, end] = text.get_buffer().get_bounds();
    return {
      kind: REPORT_KINDS[kindRow.get_selected()] ?? 'problem',
      title: String(titleRow.get_text()).trim(),
      text: String(text.get_buffer().get_text(start, end, false)).trim(),
      app: options.app,
      version: options.version,
      device: here,
    };
  };
  const saved = (): string | undefined => keyring.lookup(GITHUB_TOKEN);
  const token = (): string => saved() ?? String(tokenRow.get_text()).trim();

  function update(): void {
    const now = report();
    textGroup.set_title(t.textHeading[now.kind]);
    const isSaved = saved() !== undefined;
    tokenRow.set_visible(!isSaved);
    helpRow.set_visible(!isSaved);
    savedRow.set_visible(isSaved);
    const isDirect = token() !== '';
    sendButton.set_visible(isDirect);
    sendButton.set_sensitive(!sending && now.title !== '' && now.text !== '');
    for (const [button, main] of [
      [sendButton, isDirect],
      [formButton, !isDirect],
    ] as const) {
      if (main) button.add_css_class('suggested-action');
      else button.remove_css_class('suggested-action');
    }
  }

  function openForm(): void {
    const now = report();
    const url = formUrl(ISSUE_REPOSITORY, now);
    if (shortened(ISSUE_REPOSITORY, now)) {
      const bytes = new GLib.Bytes(new TextEncoder().encode(now.text));
      Gdk.Display.get_default()
        .get_clipboard()
        .set_content(Gdk.ContentProvider.new_for_bytes('text/plain;charset=utf-8', bytes));
    }
    launch(dialog.get_root(), url);
    dialog.close();
  }

  async function send(): Promise<void> {
    const now = report();
    const key = token();
    if (sending || key === '' || now.title === '' || now.text === '') return;
    const typed = saved() === undefined;
    sending = true;
    banner.set_revealed(false);
    sendButton.set_label(t.sending);
    update();
    const result = await createIssue({
      repo: ISSUE_REPOSITORY,
      token: key,
      report: now,
      fetch: options.fetch,
      ...(options.apiBase === undefined ? {} : { apiBase: options.apiBase }),
    });
    sending = false;
    sendButton.set_label(t.send);
    if (!result.ok) {
      banner.set_title(t.failed[result.failure]);
      banner.set_revealed(true);
      update();
      return;
    }
    // Kept only after GitHub accepted it.
    if (typed) keyring.store(GITHUB_TOKEN, key);
    showSent(result.url);
  }

  function showSent(url: string): void {
    const view = new Gtk.Button({ label: t.viewIssue, halign: Gtk.Align.CENTER });
    view.add_css_class('pill');
    view.add_css_class('report-target');
    view.connect('clicked', () => launch(dialog.get_root(), url));
    toolbar.set_content(
      new Adw.StatusPage({
        icon_name: 'emblem-ok-symbolic',
        title: t.thanks,
        description: t.thanksText,
        child: view,
      }),
    );
    toolbar.set_reveal_bottom_bars(false);
    banner.set_revealed(false);
  }

  kindRow.connect('notify::selected', update);
  titleRow.connect('changed', update);
  tokenRow.connect('changed', update);
  text.get_buffer().connect('changed', update);
  forget.connect('clicked', () => {
    keyring.clear(GITHUB_TOKEN);
    tokenRow.set_text('');
    update();
  });
  banner.connect('button-clicked', openForm);
  formButton.connect('clicked', openForm);
  sendButton.connect('clicked', () => void send());

  update();
  dialog.present(window);
}
