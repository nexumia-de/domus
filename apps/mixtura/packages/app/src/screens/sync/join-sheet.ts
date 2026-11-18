// Join a Place: the four values entered by hand. Nothing is made unless the
// file is there and opens (sync/join.ts); a refusal is said in words.

import { h } from '../../dom';
import { type ScreenContext } from '../../screen';
import { joinPlace } from '../../sync/join';
import { invalidateSync, type SyncView } from '../../sync/view';
import { invalidateStock } from '../../stock/state';
import { showToast } from '../../toast';
import { drafts } from './drafts';
import { problemLine, showButton, storageSelect, textField } from './fields';
import { closeSyncSheet, openSyncSheet } from './sheet-address';
import { sheetFrame } from './sheet-frame';
import { joinText, needsSetupLink, SETUP_URL, syncStrings } from './strings';
import type { JoinProblem } from '../../sync/join';

const t = syncStrings.join;
const d = drafts.join;

const redraw = (context: ScreenContext): void =>
  context.store.set({ syncViewRev: context.store.get().syncViewRev + 1 });

/** The problem of the last attempt, kept as a code so the setup link can follow it. */
let lastProblem: JoinProblem | null = null;

export async function start(context: ScreenContext): Promise<void> {
  const local = context.data.local();
  if (!local || d.busy) return;
  d.busy = true;
  d.problem = null;
  lastProblem = null;
  redraw(context);
  let result: Awaited<ReturnType<typeof joinPlace>>;
  try {
    result = await joinPlace(
      {
        local,
        scheduler: context.data.sync,
        cipher: context.data.cipher,
        changed: () => {
          invalidateSync(context.store);
          invalidateStock(context.store);
        },
      },
      { storageId: d.storageId, folder: d.folder, placeCode: d.code, passphrase: d.passphrase },
    );
  } catch {
    d.busy = false;
    d.problem = syncStrings.failed;
    return redraw(context);
  }
  d.busy = false;
  invalidateSync(context.store);
  if (!result.ok) {
    lastProblem = result.problem;
    d.problem = joinText(result.problem);
    return redraw(context);
  }
  d.passphrase = '';
  closeSyncSheet(context);
  showToast(context.store, t.done);
}

export function joinSheet(
  context: ScreenContext,
  view: SyncView,
  again: boolean,
  writable: boolean,
): HTMLElement {
  if (!view.storages.some((s) => s.id === d.storageId)) d.storageId = view.storages[0]?.id ?? '';
  const select = storageSelect('join-storage', t.storage, view.storages, d.storageId, (id) => {
    d.storageId = id;
    d.problem = null;
  });
  const clear = (): void => {
    d.problem = null;
    lastProblem = null;
  };
  return sheetFrame(
    'join',
    again ? t.againTitle : t.title,
    () => closeSyncSheet(context),
    h('p', { class: 'note' }, again ? t.againIntro : t.intro),
    select ??
      h(
        'div',
        { class: 'sheet-group' },
        h('p', { class: 'note', 'data-testid': 'join-no-storage' }, syncStrings.bind.noStorage),
        h(
          'button',
          {
            type: 'button',
            class: 'btn btn--tonal',
            'data-focus': 'join-add-storage',
            onclick: () => openSyncSheet(context, 'storage'),
          },
          syncStrings.storages.add,
        ),
      ),
    textField({
      id: 'join-folder',
      label: t.folder,
      value: d.folder,
      oninput: (v) => {
        d.folder = v;
        clear();
      },
    }),
    textField({
      id: 'join-code',
      label: t.placeCode,
      value: d.code,
      oninput: (v) => {
        d.code = v;
        clear();
      },
    }),
    textField({
      id: 'join-passphrase',
      label: t.passphrase,
      value: d.passphrase,
      type: d.show ? 'text' : 'password',
      autocomplete: 'off',
      oninput: (v) => {
        d.passphrase = v;
        clear();
      },
      onenter: () => void start(context),
      after: showButton('join-passphrase', d.show, () => {
        d.show = !d.show;
        redraw(context);
      }),
    }),
    problemLine(d.problem, 'join-problem'),
    lastProblem !== null &&
      needsSetupLink(lastProblem) &&
      h(
        'a',
        { class: 'btn btn--text', href: SETUP_URL, target: '_blank', rel: 'noopener noreferrer' },
        syncStrings.setupLink,
      ),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          type: 'button',
          class: 'btn btn--primary',
          disabled: !writable || d.busy || view.storages.length === 0,
          'data-focus': 'join-start',
          onclick: () => void start(context),
        },
        d.busy ? t.starting : t.start,
      ),
    ),
  );
}
