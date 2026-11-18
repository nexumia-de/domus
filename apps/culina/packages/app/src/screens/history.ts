// The history screen of a component or dish: the versions newest first, each with what was
// written about it, the diff to the version before, its tasting notes (added and edited
// afterwards), and Restore. Restore adds a new version; nothing here changes an older one.
import { diffRows } from '../versions/diff-text';
import { historyEntries, isDate, type HistoryEntry } from '../versions/history';
import {
  allTastings,
  allVersions,
  getComponent,
  getDish,
  headOfFamily,
  newId,
  notebook,
  removeTasting,
  restoreVersion,
  saveTasting,
  today,
} from '../notebook';
import type { ComponentRecord, DishRecord, TastingRecord } from '../records';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { showToast } from '../shell/toast';
import { strings } from '../strings';
import { areaField, button, textField } from './editor/form-bits';
import { storeText } from './editor/store-text';

const t = strings.versions;
type Kind = 'components' | 'dishes';
type Rec = ComponentRecord | DishRecord;

/** The note being written: a new one on a version, or one that exists. */
interface Editing {
  versionId: string;
  note?: TastingRecord;
}

export const historyScreen = (kind: Kind, id?: string): HTMLElement => {
  const screen = el('section', 'screen history');
  const back = el('a', 'back-link', strings[kind === 'components' ? 'components' : 'dishes'].back);
  back.href = hashFor(kind);
  const known =
    id === undefined ? undefined : kind === 'components' ? getComponent(id) : getDish(id);
  const head = id === undefined ? undefined : headOfFamily(kind, id);
  if (known === undefined || head === undefined) {
    screen.append(back, el('h1', undefined, t.historyLink));
    screen.append(el('p', 'note-quiet', strings[kind].unknown));
    return screen;
  }
  const current = el('a', 'back-link', t.backToCurrent);
  current.href = hashFor(kind, head.id);
  const heading = el('h1', undefined, t.historyTitle(head.name));
  const list = el('ol', 'history-list');
  const count = el('p', 'muted', '');
  screen.append(current, heading, count, list);
  let editing: Editing | undefined;

  const draw = (): void => {
    const entries = historyEntries(
      kind,
      allVersions(kind) as readonly Rec[],
      allTastings(),
      head.id,
    );
    count.textContent = t.versionCount(entries.length);
    list.replaceChildren(...entries.map((entry) => card(entry)));
  };

  const noteForm = (versionId: string, note: TastingRecord | undefined): HTMLElement => {
    const form = el('form', 'note-form');
    const date = textField(t.noteDate, note?.date ?? today());
    const text = areaField(t.noteText, note?.text ?? '');
    const status = el('p', 'hint');
    status.setAttribute('role', 'status');
    const save = async (): Promise<void> => {
      if (text.control.value.trim() === '') {
        status.textContent = t.noteNeedsText;
        return;
      }
      if (!isDate(date.control.value.trim())) {
        status.textContent = t.noteNeedsDate;
        return;
      }
      const done = await saveTasting({
        id: note?.id ?? newId(),
        ref: note?.ref ?? { kind: kind === 'components' ? 'component' : 'dish', id: versionId },
        date: date.control.value.trim(),
        text: text.control.value.trim(),
      });
      if (!done.ok) {
        status.textContent = storeText(done.error.code);
        return;
      }
      editing = undefined;
      draw();
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void save();
    });
    const row = el('div', 'actions');
    const submit = el('button', 'btn primary', t.saveNote);
    submit.type = 'submit';
    row.append(
      submit,
      button(t.cancelNote, 'quiet', () => {
        editing = undefined;
        draw();
      }),
    );
    form.append(date.wrap, text.wrap, status, row);
    return form;
  };

  const notes = (entry: HistoryEntry<Rec>): HTMLElement => {
    const box = el('section', 'version-notes');
    box.append(el('h3', undefined, t.notesHeading));
    if (entry.notes.length === 0 && editing?.versionId !== entry.record.id) {
      box.append(el('p', 'muted', t.noNotes));
    }
    for (const note of entry.notes) {
      if (editing?.note?.id === note.id) {
        box.append(noteForm(entry.record.id, note));
        continue;
      }
      const item = el('div', 'tasting-note');
      item.append(el('p', 'muted', note.date), el('p', undefined, note.text));
      item.append(
        button(t.editNote, 'quiet edit-note', () => {
          editing = { versionId: entry.record.id, note };
          draw();
        }),
      );
      item.append(
        button(t.removeNote, 'quiet remove-note', () => {
          void removeTasting(note.id).then((done) => {
            if (!done.ok) return showToast(storeText(done.error.code));
            draw();
            showToast(t.noteRemoved, {
              label: strings.editor.undo,
              run() {
                void saveTasting(done.removed).then(draw);
              },
            });
          });
        }),
      );
      box.append(item);
    }
    if (editing?.versionId === entry.record.id && editing.note === undefined) {
      box.append(noteForm(entry.record.id, undefined));
    } else {
      box.append(
        button(t.addNote, 'quiet add-note', () => {
          editing = { versionId: entry.record.id };
          draw();
        }),
      );
    }
    return box;
  };

  const card = (entry: HistoryEntry<Rec>): HTMLElement => {
    const { record } = entry;
    const item = el('li', 'history-entry card');
    item.dataset.version = String(entry.number);
    item.append(el('h2', undefined, t.versionLine(entry.number, record.version.date)));
    if (entry.isHead) item.append(el('span', 'tag', t.current));
    const written = [
      record.version.change === undefined ? undefined : t.change(record.version.change),
      record.version.reason === undefined ? undefined : t.reason(record.version.reason),
    ].filter((x): x is string => x !== undefined);
    if (written.length === 0) item.append(el('p', 'muted', t.noChangeText));
    for (const line of written) item.append(el('p', undefined, line));

    const actions = el('div', 'actions');
    const open = el('a', 'btn quiet', t.open);
    open.href = hashFor(kind, record.id);
    actions.append(open);
    if (!entry.isHead) {
      actions.append(
        button(t.restore, 'quiet restore', () => {
          void restoreVersion(kind, record.id, t.restoreChange(entry.number)).then((done) => {
            if (!done.ok) return showToast(storeText(done.error.code));
            showToast(t.restored(entry.number));
            draw();
          });
        }),
      );
    }
    item.append(actions);

    const diff = el('section', 'version-diff');
    if (entry.diff === undefined) diff.append(el('p', 'muted', t.firstVersion));
    else if (entry.diff.empty) diff.append(el('p', 'muted', t.noChange));
    else {
      diff.append(el('h3', undefined, t.diffHeading));
      const rows = el('ul', 'diff-rows');
      for (const row of diffRows(notebook(), entry.diff, kind === 'dishes')) {
        const li = el('li', `diff-row diff-${row.kind}`, row.text);
        rows.append(li);
      }
      diff.append(rows);
    }
    item.append(diff, notes(entry));
    return item;
  };

  draw();
  return screen;
};
