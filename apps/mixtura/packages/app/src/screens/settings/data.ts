// Settings, Data (#/settings/data): export, import with a summary, undo and
// the backup reminder. Texts: docs/ui-strings.md; behaviour:
// docs/screens-stock-settings.md#export-and-import. The reminder is a calm
// banner on the Settings screens only, never on the Drinks list.

import { type AppState } from '../../app-state';
import { h, icon } from '../../dom';
import { importPanel } from '../../components/import-preview';
import { type ExchangeActions } from '../../exchange-actions';
import { type ScreenContext } from '../../screen';
import { strings } from '../../strings';
import { reminderDue } from '../../store';

const s = strings.data;

/** The row in Settings that opens the Data screen. */
export function dataRow(state: AppState): HTMLElement {
  return h(
    'a',
    { class: 'row', href: '#/settings/data' },
    h(
      'span',
      { class: 'row-main' },
      h('span', { class: 'row-title' }, strings.titles.data),
      h('span', { class: 'row-sub' }, strings.settings.dataHint(state.backup.changesSinceExport)),
    ),
    h('span', { class: 'row-chev' }, icon([['path', { d: 'M9 5l7 7-7 7' }]])),
  );
}

/** Calm, dismissible, only after real changes and 30 days; null otherwise. */
export function reminderBanner(state: AppState, exchange: ExchangeActions): HTMLElement | null {
  if (state.storage.kind !== 'ready' || !reminderDue(state.backup, Date.now())) return null;
  return h(
    'div',
    { class: 'notice', role: 'status', 'data-testid': 'backup-reminder' },
    h('span', {}, s.reminder(state.backup.changesSinceExport)),
    h(
      'a',
      { class: 'btn btn--tonal', href: '#/settings/data', 'data-focus': 'reminder-export' },
      s.exportButton,
    ),
    h(
      'button',
      {
        class: 'btn btn--tonal',
        type: 'button',
        'data-focus': 'reminder-dismiss',
        onclick: () => void exchange.dismissReminder(),
      },
      s.dismiss,
    ),
  );
}

export function dataView({ state, data }: ScreenContext): HTMLElement {
  const { exchange } = data;
  const ready = state.storage.kind === 'ready';
  const empty = state.userRecords === 0;
  const input = h('input', {
    type: 'file',
    accept: 'application/json,.json',
    hidden: true,
    'data-testid': 'import-input',
    onchange: (event) => {
      const el = event.target as HTMLInputElement;
      const file = el.files?.[0];
      el.value = '';
      if (file) void exchange.chooseFile(file);
    },
  });
  const { backup } = state;
  return h(
    'div',
    { class: 'stack' },
    reminderBanner(state, exchange),
    h(
      'div',
      { class: 'card' },
      h('span', { class: 'hint' }, s.intro),
      h(
        'span',
        { id: 'last-export' },
        backup.lastExportAt ? s.lastExport(backup.lastExportAt.slice(0, 10)) : s.neverExported,
      ),
      h('span', { id: 'changes-since' }, s.changesSince(backup.changesSinceExport)),
      empty && h('span', { class: 'hint', id: 'nothing-to-export' }, s.nothing),
      h(
        'div',
        { class: 'btn-row' },
        h(
          'button',
          {
            class: 'btn btn--primary',
            type: 'button',
            disabled: !ready || empty,
            'data-focus': 'export',
            onclick: () => void exchange.exportAll(),
          },
          s.exportButton,
        ),
        h(
          'button',
          {
            class: 'btn btn--tonal',
            type: 'button',
            disabled: !ready || state.importFlow.kind === 'busy',
            'data-focus': 'import',
            onclick: () => input.click(),
          },
          s.importButton,
        ),
        input,
      ),
    ),
    importPanel(state.importFlow, exchange),
    state.importBackup &&
      h(
        'div',
        { class: 'card' },
        h('span', { class: 'hint' }, s.backupHint),
        h(
          'button',
          {
            class: 'btn btn--tonal',
            type: 'button',
            'data-focus': 'delete-backup',
            onclick: () => void exchange.deleteImportBackup(),
          },
          s.deleteBackup,
        ),
      ),
  );
}
