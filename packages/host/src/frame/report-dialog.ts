// The "Report a Problem" dialog of the web apps (docs/feedback.md): the user writes a problem or
// an idea; with a GitHub token it becomes an issue right away, without one GitHub's issue form
// opens in a new tab, filled in. A modal <dialog>: focus stays inside, Escape closes it. Nothing
// here logs; only what the user typed, the app, the version and the device leave the page.
import { createIssue } from '../feedback/github-issue';
import {
  ISSUE_REPOSITORY,
  REPORT_KINDS,
  TOKEN_URL,
  formUrl,
  shortened,
  webDevice,
  type Device,
  type Report,
  type ReportKind,
} from '../feedback/report';
import type { FeedbackTexts } from '../feedback/texts';
import { el } from './dom';
import { browserTokenStore, type TokenStore } from './report-token';

export interface ReportDialogOptions {
  texts: FeedbackTexts;
  /** The visible name, in the dialog's words. */
  appName: string;
  /** One of the issue forms' `app` options: the app's English visible name. */
  app: string;
  version: string;
  /** `owner/name`; default the household apps' repository. */
  repo?: string;
  /** Defaults to the global `fetch`. */
  fetch?: typeof fetch;
  /** For tests; default `https://api.github.com`. */
  apiBase?: string;
  /** Default: localStorage (report-token.ts). */
  tokens?: TokenStore;
  /** Opens a web page; default a new tab without opener. */
  open?: (url: string) => void;
  /** Puts text on the clipboard; default the async Clipboard API. */
  copy?: (text: string) => Promise<void>;
  /** Default from the main pointer (`webDevice`). */
  device?: Device;
}

export interface ReportDialog {
  node: HTMLDialogElement;
  close(): void;
}

let count = 0;

/** Builds the dialog, adds it to the page and shows it modally; closing removes it. */
export function openReportDialog(options: ReportDialogOptions): ReportDialog {
  const t = options.texts;
  const repo = options.repo ?? ISSUE_REPOSITORY;
  const tokens = options.tokens ?? browserTokenStore();
  const open =
    options.open ?? ((url: string) => void window.open(url, '_blank', 'noopener,noreferrer'));
  const copy = options.copy ?? ((text: string) => navigator.clipboard.writeText(text));
  const device =
    options.device ?? webDevice(globalThis.matchMedia?.('(pointer: coarse)').matches ?? false);
  const id = `fr-report-${++count}`;

  const dialog = el('dialog', { class: 'fr-dialog', 'aria-labelledby': `${id}-title` });
  const closeButton = el(
    'button',
    { type: 'button', class: 'fr-dialog-close', 'aria-label': t.close, title: t.close },
    '×',
  );
  const head = el(
    'div',
    { class: 'fr-dialog-head' },
    el('h2', { id: `${id}-title`, class: 'fr-dialog-title' }, t.title),
    closeButton,
  );

  const bannerText = el('span', { class: 'fr-dialog-banner-text' });
  const bannerButton = el(
    'button',
    { type: 'button', class: 'fr-dialog-banner-action' },
    t.openForm,
  );
  const banner = el(
    'div',
    { class: 'fr-dialog-banner', role: 'alert', hidden: true },
    bannerText,
    bannerButton,
  );

  const kinds = el(
    'fieldset',
    { class: 'fr-dialog-kinds' },
    el('legend', { class: 'fr-dialog-label' }, t.kind),
  );
  const kindInputs = REPORT_KINDS.map((kind, index) => {
    const input = el('input', {
      type: 'radio',
      name: `${id}-kind`,
      value: kind,
      checked: index === 0,
    });
    kinds.append(el('label', { class: 'fr-dialog-kind' }, input, el('span', {}, t.kinds[kind])));
    return input;
  });

  const titleInput = el('input', {
    id: `${id}-issue-title`,
    class: 'fr-dialog-input',
    type: 'text',
    autocomplete: 'off',
    maxlength: 256,
  });
  const textLabel = el('label', { class: 'fr-dialog-label', for: `${id}-text` });
  const textInput = el('textarea', { id: `${id}-text`, class: 'fr-dialog-input', rows: 6 });

  const tokenInput = el('input', {
    id: `${id}-token`,
    class: 'fr-dialog-input',
    type: 'password',
    autocomplete: 'off',
    spellcheck: 'false',
  });
  const tokenField = el(
    'div',
    { class: 'fr-dialog-field' },
    el('label', { class: 'fr-dialog-label', for: `${id}-token` }, t.token),
    tokenInput,
    el(
      'p',
      { class: 'fr-dialog-hint' },
      el(
        'a',
        { href: TOKEN_URL, target: '_blank', rel: 'noopener noreferrer', class: 'fr-dialog-link' },
        t.createToken,
      ),
      ' – ',
      t.createTokenHint,
    ),
  );
  const forgetButton = el('button', { type: 'button', class: 'fr-dialog-button' }, t.forget);
  const savedRow = el(
    'div',
    { class: 'fr-dialog-saved' },
    el(
      'span',
      {},
      el('span', { class: 'fr-dialog-saved-name' }, t.tokenSaved),
      el('span', { class: 'fr-dialog-hint' }, t.keptBrowser),
    ),
    forgetButton,
  );

  const form = el(
    'div',
    { class: 'fr-dialog-body' },
    el('p', { class: 'fr-dialog-hint' }, t.intro(options.appName)),
    kinds,
    el(
      'div',
      { class: 'fr-dialog-field' },
      el('label', { class: 'fr-dialog-label', for: `${id}-issue-title` }, t.issueTitle),
      titleInput,
    ),
    el('div', { class: 'fr-dialog-field' }, textLabel, textInput),
    el(
      'section',
      { class: 'fr-dialog-direct', 'aria-labelledby': `${id}-direct` },
      el('h3', { id: `${id}-direct`, class: 'fr-dialog-subtitle' }, t.direct),
      el('p', { class: 'fr-dialog-hint' }, t.directHint),
      tokenField,
      savedRow,
    ),
  );

  const formButton = el('button', { type: 'button', class: 'fr-dialog-button' }, t.openForm);
  const sendButton = el('button', { type: 'button', class: 'fr-dialog-button' }, t.send);
  const actions = el('div', { class: 'fr-dialog-actions' }, formButton, sendButton);
  dialog.append(head, banner, form, actions);

  let sending = false;

  const kind = (): ReportKind =>
    (kindInputs.find((input) => input.checked)?.value as ReportKind | undefined) ?? 'problem';
  const report = (): Report => ({
    kind: kind(),
    title: titleInput.value.trim(),
    text: textInput.value.trim(),
    app: options.app,
    version: options.version,
    device,
  });
  const token = (): string => tokens.get() ?? tokenInput.value.trim();

  function update(): void {
    const now = report();
    textLabel.textContent = t.textHeading[now.kind];
    const saved = tokens.get() !== undefined;
    tokenField.hidden = saved;
    savedRow.hidden = !saved;
    const direct = token() !== '';
    sendButton.hidden = !direct;
    sendButton.disabled = sending || now.title === '' || now.text === '';
    sendButton.classList.toggle('fr-dialog-main', direct);
    formButton.classList.toggle('fr-dialog-main', !direct);
  }

  function close(): void {
    if (dialog.open) dialog.close();
    dialog.remove();
  }

  function openForm(): void {
    const now = report();
    const url = formUrl(repo, now);
    if (shortened(repo, now)) void copy(now.text).catch(() => undefined);
    open(url);
    close();
  }

  async function send(): Promise<void> {
    const now = report();
    const key = token();
    if (sending || key === '' || now.title === '' || now.text === '') return;
    const typed = tokens.get() === undefined;
    sending = true;
    banner.hidden = true;
    sendButton.textContent = t.sending;
    update();
    const result = await createIssue({
      repo,
      token: key,
      report: now,
      fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
      ...(options.apiBase === undefined ? {} : { apiBase: options.apiBase }),
    });
    sending = false;
    sendButton.textContent = t.send;
    if (!result.ok) {
      bannerText.textContent = t.failed[result.failure];
      banner.hidden = false;
      update();
      return;
    }
    // Kept only after GitHub accepted it.
    if (typed) tokens.set(key);
    showSent(result.url);
  }

  function showSent(url: string): void {
    const view = el(
      'a',
      {
        href: url,
        target: '_blank',
        rel: 'noopener noreferrer',
        class: 'fr-dialog-button fr-dialog-main',
      },
      t.viewIssue,
    );
    const done = el(
      'div',
      { class: 'fr-dialog-body fr-dialog-done', role: 'status' },
      el('h3', { class: 'fr-dialog-subtitle' }, t.thanks),
      el('p', {}, t.thanksText),
      view,
    );
    form.replaceWith(done);
    actions.remove();
    banner.hidden = true;
    view.focus();
  }

  for (const input of [...kindInputs, titleInput, textInput, tokenInput])
    input.addEventListener('input', update);
  for (const input of kindInputs) input.addEventListener('change', update);
  forgetButton.addEventListener('click', () => {
    tokens.clear();
    tokenInput.value = '';
    update();
    tokenInput.focus();
  });
  formButton.addEventListener('click', openForm);
  bannerButton.addEventListener('click', openForm);
  sendButton.addEventListener('click', () => void send());
  closeButton.addEventListener('click', close);
  dialog.addEventListener('close', () => dialog.remove());

  update();
  document.body.append(dialog);
  dialog.showModal();
  return { node: dialog, close };
}
