// Add Storage: name, address, user name and password, Test Connection with
// one text per state, and Add Storage. Texts: docs/ui-strings.md#sync.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { addStorage, checkStorage, type StorageRefusal } from '../../sync/storages';
import { invalidateSync } from '../../sync/view';
import { createWebdavAdapter } from '../../sync/webdav';
import { testConnection } from '../../sync/webdav-connection';
import { drafts } from './drafts';
import { problemLine, showButton, textField } from './fields';
import { closeSyncSheet } from './sheet-address';
import { sheetFrame } from './sheet-frame';
import { connectionTexts, etagNotExposedText, SETUP_URL, syncStrings } from './strings';

const t = syncStrings.form;
const d = drafts.storage;

const refusalText = (reason: StorageRefusal): string =>
  reason === 'empty-label'
    ? t.emptyLabel
    : reason === 'empty-address'
      ? t.emptyAddress
      : t.badAddress;

const redraw = (context: ScreenContext): void =>
  context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });

/** Forget the last test when a field changes: it was for other values. */
function typed(context: ScreenContext, set: (value: string) => void): (value: string) => void {
  return (value) => {
    set(value);
    d.problem = null;
    if (d.test !== null) {
      d.test = null;
      redraw(context);
    }
  };
}

async function test(context: ScreenContext): Promise<void> {
  const checked = checkStorage(d);
  if (!checked.ok) {
    d.problem = refusalText(checked.reason);
    return redraw(context);
  }
  d.problem = null;
  d.test = null;
  d.testing = true;
  redraw(context);
  const { baseUrl, username, password } = checked.storage;
  const result = await testConnection(
    createWebdavAdapter({
      baseUrl,
      ...(username !== undefined && { username }),
      ...(password !== undefined && { password }),
    }),
  );
  d.testing = false;
  d.test = result;
  redraw(context);
}

async function save(context: ScreenContext): Promise<void> {
  const local = context.data.local();
  const checked = checkStorage(d);
  if (!local) return;
  if (!checked.ok) {
    d.problem = refusalText(checked.reason);
    return redraw(context);
  }
  await addStorage(local, checked.storage);
  invalidateSync(context.store);
  closeSyncSheet(context);
}

/** The words for a test result; the setup link follows the ones a server setting fixes. */
function result(): HTMLElement | null {
  if (d.testing) return h('p', { class: 'note', role: 'status' }, t.testing);
  if (!d.test) return null;
  const { state, detail } = d.test;
  const exposed = state === 'blocked' && detail === 'etag-not-exposed';
  const text = exposed ? etagNotExposedText : connectionTexts[state];
  const ok = state === 'reachable';
  return h(
    'div',
    {
      class: 'sync-result',
      role: ok ? 'status' : 'alert',
      'data-testid': 'test-result',
      'data-state': exposed ? 'etag-not-exposed' : state,
    },
    h('p', { class: ok ? 'note' : 'field-error' }, text),
    (state === 'blocked' || state === 'server') &&
      h(
        'a',
        { class: 'btn btn--text', href: SETUP_URL, target: '_blank', rel: 'noopener noreferrer' },
        syncStrings.setupLink,
      ),
  );
}

export function storageSheet(context: ScreenContext, writable: boolean): HTMLElement {
  return sheetFrame(
    'storage',
    t.title,
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, t.intro),
    textField({
      id: 'storage-label',
      label: t.label,
      hint: t.labelHint,
      value: d.label,
      oninput: typed(context, (v) => (d.label = v)),
    }),
    textField({
      id: 'storage-address',
      label: t.address,
      hint: t.addressHint,
      value: d.address,
      inputmode: 'url',
      oninput: typed(context, (v) => (d.address = v)),
    }),
    textField({
      id: 'storage-user',
      label: t.user,
      value: d.username,
      autocomplete: 'off',
      oninput: typed(context, (v) => (d.username = v)),
    }),
    textField({
      id: 'storage-password',
      label: t.password,
      value: d.password,
      type: d.show ? 'text' : 'password',
      autocomplete: 'new-password',
      oninput: typed(context, (v) => (d.password = v)),
      onenter: () => void save(context),
      after: showButton('storage-password', d.show, () => {
        d.show = !d.show;
        redraw(context);
      }),
    }),
    problemLine(d.problem, 'storage-problem'),
    result(),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--tonal',
          disabled: d.testing,
          'data-focus': 'storage-test',
          onclick: () => void test(context),
        },
        t.test,
      ),
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable,
          'data-focus': 'storage-save',
          onclick: () => void save(context),
        },
        t.save,
      ),
    ),
  );
}
