// The version part of a component or dish detail: which version it is, what the author wrote
// about it, the way to the history, the variation link both ways, and for an older version a
// quiet line with the link to the current one.
import {
  headOfFamily,
  makeVariation,
  numberOf,
  parentOf,
  variationsFor,
  type VersionKind,
} from '../notebook';
import type { ComponentRecord, DishRecord } from '../records';
import { hashFor } from '../router';
import { formatDate } from '../shared/locale';
import { el } from '../shell/el';
import { showToast } from '../shell/toast';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const t = strings.versions;
type Rec = ComponentRecord | DishRecord;

const link = (
  kind: VersionKind,
  id: string,
  text: string,
  action?: 'history',
): HTMLAnchorElement => {
  const a = el('a', 'touch-link', text);
  a.href = hashFor(kind, id, action);
  return a;
};

/** Version number, date, change and reason of the record on screen. */
export const versionLines = (kind: VersionKind, record: Rec): HTMLElement => {
  const box = el('div', 'version-lines');
  box.append(
    el(
      'p',
      'muted version-line',
      t.versionLine(numberOf(kind, record.id) ?? 1, formatDate(record.version.date)),
    ),
  );
  if (record.version.change !== undefined)
    box.append(el('p', 'muted', t.change(record.version.change)));
  if (record.version.reason !== undefined)
    box.append(el('p', 'muted', t.reason(record.version.reason)));
  return box;
};

/** History, Make a variation, the older-version line and the variation links. */
export const versionSection = (kind: VersionKind, record: Rec): HTMLElement => {
  const section = el('section', 'version-section');
  const head = headOfFamily(kind, record.id);
  if (head !== undefined && head.id !== record.id) {
    const old = el('p', 'note-quiet older-version', `${t.olderLine} `);
    old.append(link(kind, head.id, t.currentLink));
    section.append(old);
  }
  const row = el('div', 'actions version-actions');
  row.append(link(kind, record.id, t.historyLink, 'history'));
  row.lastElementChild?.classList.add('btn', 'quiet');
  if (head?.id === record.id) {
    const make = el('button', 'btn quiet', t.makeVariation);
    make.type = 'button';
    make.addEventListener('click', () => {
      void makeVariation(kind, record.id, t.variationName(record.name)).then((done) => {
        if (!done.ok) return showToast(storeText(done.error.code));
        showToast(t.variationMade(t.variationName(record.name)));
        window.location.hash = hashFor(kind, done.id);
      });
    });
    row.append(make);
  }
  section.append(row);

  const parent = parentOf(kind, record.id);
  if (parent.kind === 'parent') {
    const line = el('p', 'variation-parent', `${t.variationOf} `);
    line.append(link(kind, parent.record.id, parent.record.name));
    line.append(` (${t.versionOf(numberOf(kind, parent.record.id) ?? 1)})`);
    section.append(line);
  } else if (parent.kind === 'removed') {
    section.append(el('p', 'variation-parent muted', t.parentRemoved));
  }
  const variations = variationsFor(kind, record.id);
  if (variations.length > 0) {
    section.append(el('h2', undefined, t.variationsHeading));
    const list = el('ul', 'variation-list');
    for (const v of variations) {
      const item = el('li');
      item.append(link(kind, v.head.id, v.head.name));
      list.append(item);
    }
    section.append(list);
  }
  return section;
};
