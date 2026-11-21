// Settings, "Your data": export, import, what the file does not hold, the date of the last export,
// the backup reminder, and "Erase everything on this device".
import { EXPORT_KINDS } from '@culina/engine';
import { eraseCounts, eraseEverything, type EraseCounts } from '../exchange/erase';
import { exportEverything } from '../exchange/export-file';
import {
  readLastExport,
  readReminderDays,
  REMINDER_CHOICES,
  writeReminderDays,
} from '../exchange/backup-prefs';
import { stockSpaces } from '../notebook';
import { hashFor } from '../router';
import { refreshBackupBanner } from '../shell/backup-banner';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const text = strings.settings;
const kinds = strings.importing.kinds;

const lastExportLine = (): string => {
  const at = readLastExport();
  return at === undefined ? text.neverExported : text.lastExport(at.slice(0, 10));
};

const reminderGroup = (note: HTMLElement): HTMLElement => {
  const current = readReminderDays();
  const group = el('fieldset', 'choices');
  group.append(el('legend', undefined, text.reminderLegend));
  for (const days of REMINDER_CHOICES) {
    const input = el('input');
    input.type = 'radio';
    input.name = 'reminder';
    input.value = String(days);
    input.checked = days === current;
    input.addEventListener('change', () => {
      note.textContent = writeReminderDays(days) ? '' : text.reminderNotSaved;
      void refreshBackupBanner();
    });
    const label = el('label', 'choice');
    label.append(
      input,
      el('span', undefined, days === 0 ? text.reminderOff : text.reminderDays(days)),
    );
    group.append(label);
  }
  return group;
};

const button = (label: string, className = 'btn'): HTMLButtonElement => {
  const b = el('button', className, label);
  b.type = 'button';
  return b;
};

/** What an erase removes, as one list for the question; empty when nothing would go. */
const eraseList = (counts: EraseCounts): string[] => [
  ...EXPORT_KINDS.flatMap((kind) =>
    counts.records[kind] > 0 ? [`${counts.records[kind]} ${kinds[kind]}`] : [],
  ),
  ...(counts.drafts > 0 ? [text.eraseDrafts(counts.drafts)] : []),
  ...(counts.prefs > 0 ? [text.erasePrefs] : []),
];

/**
 * "Erase everything on this device": an inline question that names what goes and offers the export
 * first; the stock of the space stays and the question says so. After the erase the app starts
 * again, as on a first start.
 */
const eraseBlock = (canWrite: boolean, exportNow: () => void, status: HTMLElement): HTMLElement => {
  const box = el('div', 'erase-block');
  const open = button(text.eraseButton);
  open.disabled = !canWrite;
  const ask = el('div', 'confirm-row erase-ask');
  const close = (): void => {
    ask.replaceChildren();
    open.hidden = false;
  };
  open.addEventListener('click', () => {
    void eraseCounts().then((done) => {
      if (!done.ok) {
        status.textContent = storeText(done.error.code);
        return;
      }
      const list = eraseList(done.counts);
      open.hidden = true;
      if (list.length === 0) {
        const cancel = button(text.eraseCancel);
        cancel.addEventListener('click', close);
        ask.replaceChildren(el('p', 'note', text.eraseNothing), cancel);
        return;
      }
      const parts: HTMLElement[] = [el('p', 'note erase-what', text.eraseAsk(list.join(', ')))];
      const { used } = stockSpaces();
      if (used !== undefined) {
        const household = el('a', 'btn quiet', text.eraseHousehold);
        household.href = `../#/spaces/${encodeURIComponent(used.id)}`;
        parts.push(
          el('p', 'note-quiet erase-stock', text.eraseStockStays(used.name)),
          el('p', 'note-quiet', text.eraseStockWhere),
          household,
        );
      }
      const first = button(text.eraseExportFirst);
      first.addEventListener('click', exportNow);
      const yes = button(text.eraseConfirm, 'btn primary');
      yes.addEventListener('click', () => {
        yes.disabled = true;
        void eraseEverything().then((erased) => {
          if (!erased.ok) {
            yes.disabled = false;
            status.textContent = storeText(erased.error.code);
            return;
          }
          // A new start reads the empty database and the default settings, as on a first start.
          window.location.hash = hashFor('start');
          window.location.reload();
        });
      });
      const no = button(text.eraseCancel);
      no.addEventListener('click', close);
      const row = el('div', 'actions');
      row.append(first, yes, no);
      ask.replaceChildren(...parts, row);
    });
  });
  box.append(el('p', 'muted', text.eraseHint), el('p', 'muted', text.eraseUndo), open, ask);
  return box;
};

export const dataSection = (canWrite: boolean): HTMLElement => {
  const section = el('section', 'data-section');
  const last = el('p', 'note-quiet', lastExportLine());
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  const exportButton = el('button', 'btn', text.exportButton);
  exportButton.type = 'button';
  exportButton.disabled = !canWrite;
  const exportNow = (): void => {
    void exportEverything().then((done) => {
      if (!done.ok) status.textContent = storeText(done.error.code);
      else if (done.count === 0) status.textContent = text.exportNothing;
      else {
        status.textContent = text.exportedNote;
        last.textContent = lastExportLine();
        void refreshBackupBanner();
      }
    });
  };
  exportButton.addEventListener('click', exportNow);
  const importLink = el('a', 'btn', text.importLink);
  importLink.href = hashFor('settings', undefined, 'import');
  const actions = el('div', 'actions');
  actions.append(exportButton, importLink);
  const reminderNote = el('p', 'note');
  reminderNote.setAttribute('role', 'status');
  section.append(
    el('h2', undefined, text.dataHeading),
    el('p', 'muted', text.dataHint),
    el('p', 'muted not-in-file', text.notInFileStock(stockSpaces().used?.name)),
    el('p', 'muted', text.notInFileOther),
    actions,
    status,
    last,
    reminderGroup(reminderNote),
    reminderNote,
    eraseBlock(canWrite, exportNow, status),
  );
  return section;
};
