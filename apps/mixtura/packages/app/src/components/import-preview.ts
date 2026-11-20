// The import panel: what a chosen file would do (or what a share link
// brings) with the buttons to apply it, and the refusal of a file that cannot
// be read. The Data screen draws it for a file, the share screen for a link;
// one component so both look and behave alike (docs/export-format.md#import,
// docs/screens-specs.md#share-a-drink).

import { type ImportFlow, type ShareFailure } from '../app-state';
import { h } from '../dom';
import { type ExchangeActions, formatCounts, shownTotal } from '../exchange-actions';
import { shareStrings } from '../share/strings';
import { strings } from '../strings';
import { isNoOp, MAX_FILE_BYTES, type ParseFailure } from '../store';

const s = strings.data;

type PreviewFlow = Extract<ImportFlow, { kind: 'preview' }>;

/** What the share variant of the preview does; the Data screen passes none. */
export interface ShareButtons {
  add(): void;
  close(): void;
}

function failureText(failure: ParseFailure): { title: string; text: string } {
  const e = s.errors;
  switch (failure.kind) {
    case 'not-mixtura':
      return e.notMixtura;
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

function shareFailureText(reason: ShareFailure): { title: string; text: string } {
  const e = shareStrings.errors;
  switch (reason) {
    case 'damaged':
      return e.damaged;
    case 'version':
      return e.version;
    case 'too-large':
      return e.tooLarge;
    case 'not-drink':
      return e.notDrink;
    case 'no-storage':
      return e.noStorage;
  }
}

/** The preview of a share link: the same card, one drink, a merge only. */
function sharePreview(flow: PreviewFlow, share: ShareButtons): HTMLElement {
  const t = shareStrings;
  const nothingNew = isNoOp(flow.merge);
  return h(
    'div',
    { class: 'card', 'data-testid': 'import-preview' },
    h('strong', {}, t.previewTitle(flow.share?.name ?? null)),
    h(
      'span',
      { class: 'hint', 'data-testid': 'share-summary' },
      nothingNew ? t.alreadyHave : `${t.summary(flow.merge.added)} ${t.previewText}`,
    ),
    h(
      'div',
      { class: 'btn-row' },
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          disabled: nothingNew,
          'data-focus': 'share-add',
          onclick: share.add,
        },
        t.add,
      ),
      h(
        'button',
        {
          class: 'btn btn--tonal',
          type: 'button',
          'data-focus': 'share-close',
          onclick: share.close,
        },
        nothingNew ? t.dismiss : t.cancel,
      ),
    ),
  );
}

export function importPanel(
  flow: ImportFlow,
  exchange: ExchangeActions,
  share?: ShareButtons,
): HTMLElement | null {
  if (flow.kind === 'error') {
    const { title, text } = failureText(flow.failure);
    return h(
      'div',
      { class: 'card', role: 'alert', 'data-testid': 'import-error' },
      h('strong', {}, title),
      h('span', {}, text),
    );
  }
  if (flow.kind === 'share-error') {
    const { title, text } = shareFailureText(flow.reason);
    return h(
      'div',
      { class: 'card', role: 'alert', 'data-testid': 'import-error' },
      h('strong', {}, title),
      h('span', {}, text),
    );
  }
  if (flow.kind !== 'preview') return null;
  if (flow.share && share) return sharePreview(flow, share);
  const file = flow.file;
  const counts = {
    ingredients: file.ingredients.length,
    templates: file.templates.length,
    specs: file.specs.length,
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
        `add ${shownTotal(flow.merge.added)}, replace ${shownTotal(flow.merge.replaced)}, skip ${shownTotal(flow.merge.skipped)}`,
      ),
    ),
    h(
      'span',
      { class: 'hint' },
      s.replaceHint(
        `add ${shownTotal(flow.replace.added)}, replace ${shownTotal(flow.replace.replaced)}, remove ${shownTotal(flow.replace.removed)}, keep ${shownTotal(flow.replace.skipped)}`,
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
