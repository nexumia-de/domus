// Settings, Data (#/settings/data): export, import with a summary, undo and
// the backup reminder. Texts: docs/ui-strings.md; behaviour:
// docs/screens-stock-settings.md#export-and-import. The reminder is a calm
// banner on the Settings screens only, never on the Drinks list.

import { type AppState, type ImportFlow } from '../../app-state';
import { h, icon } from '../../dom';
import { type ExchangeActions, formatCounts } from '../../exchange-actions';
import { type ScreenContext } from '../../screen';
import { strings } from '../../strings';
import { MAX_FILE_BYTES, reminderDue, type ParseFailure } from '../../store';

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

function failureText(failure: ParseFailure): { title: string; text: string } {
  const e = s.errors;
  switch (failure.kind) {
    case 'not-mixtura':
      return e.notMixtura;
    case 'needs-place':
      return e.needsPlace;
    case 'newer':
      return { title: e.newer.title, text: e.newer.text(failure.found, failure.supported) };
    case 'unreadable':
      return { title: e.unreadable.title, text: e.unreadable.text(failure.reason) };
    case 'too-large':
      return { title: e.tooLarge.title, text: e.tooLarge.text(MAX_FILE_BYTES / (1024 * 1024)) };
    case 'invalid':
      return {
        title: e.invalid.title,
        text: e.invalid.text(failure.problems[0] ?? 'Invalid', failure.problems.length - 1),
      };
  }
}

function importPanel(flow: ImportFlow, exchange: ExchangeActions): HTMLElement | null {
  if (flow.kind === 'error') {
    const { title, text } = failureText(flow.failure);
    return h(
      'div',
      { class: 'card', role: 'alert', 'data-testid': 'import-error' },
      h('strong', {}, title),
      h('span', {}, text),
    );
  }
  if (flow.kind !== 'preview') return null;
  const file = flow.file;
  const counts = {
    ingredients: file.ingredients.length,
    templates: file.templates.length,
    specs: file.specs.length,
    places: file.places.length,
    stock: file.stock.length,
    affinities: file.affinities.length,
  };
  return h(
    'div',
    { class: 'card', 'data-testid': 'import-preview' },
    h('strong', {}, s.summary(formatCounts(counts))),
    h(
      'span',
      { class: 'hint' },
      s.mergeHint(
        `add ${total(flow.merge.added)}, replace ${total(flow.merge.replaced)}, skip ${total(flow.merge.skipped)}`,
      ),
    ),
    h(
      'span',
      { class: 'hint' },
      s.replaceHint(
        `add ${total(flow.replace.added)}, replace ${total(flow.replace.replaced)}, remove ${total(flow.replace.removed)}, keep ${total(flow.replace.skipped)}`,
      ),
    ),
    flow.migratedFrom !== null && h('span', { class: 'hint' }, s.migrated(flow.migratedFrom)),
    flow.seedMismatch !== null &&
      h('span', { class: 'hint' }, s.seedMismatch(flow.seedMismatch.found, flow.seedMismatch.own)),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          'data-focus': 'import-merge',
          onclick: () => void exchange.apply('merge'),
        },
        s.merge,
      ),
      h(
        'button',
        {
          class: 'btn btn--tonal',
          type: 'button',
          'data-focus': 'import-replace',
          onclick: () => void exchange.apply('replace'),
        },
        s.replace,
      ),
      h(
        'button',
        {
          class: 'btn btn--tonal',
          type: 'button',
          'data-focus': 'import-cancel',
          onclick: () => exchange.cancelImport(),
        },
        s.cancel,
      ),
    ),
  );
}

const total = (counts: Record<string, number>): number =>
  Object.values(counts).reduce((sum, n) => sum + n, 0);

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
