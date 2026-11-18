// Settings, "Your data": export, import, the date of the last export and the backup reminder.
import { exportEverything } from '../exchange/export-file';
import {
  readLastExport,
  readReminderDays,
  REMINDER_CHOICES,
  writeReminderDays,
} from '../exchange/backup-prefs';
import { hashFor } from '../router';
import { refreshBackupBanner } from '../shell/backup-banner';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const text = strings.settings;

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

export const dataSection = (canWrite: boolean): HTMLElement => {
  const section = el('section', 'data-section');
  const last = el('p', 'note-quiet', lastExportLine());
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  const exportButton = el('button', 'btn', text.exportButton);
  exportButton.type = 'button';
  exportButton.disabled = !canWrite;
  exportButton.addEventListener('click', () => {
    void exportEverything().then((done) => {
      if (!done.ok) status.textContent = storeText(done.error.code);
      else if (done.count === 0) status.textContent = text.exportNothing;
      else {
        status.textContent = text.exportedNote;
        last.textContent = lastExportLine();
        void refreshBackupBanner();
      }
    });
  });
  const importLink = el('a', 'btn', text.importLink);
  importLink.href = hashFor('settings', undefined, 'import');
  const actions = el('div', 'actions');
  actions.append(exportButton, importLink);
  const reminderNote = el('p', 'note');
  reminderNote.setAttribute('role', 'status');
  section.append(
    el('h2', undefined, text.dataHeading),
    el('p', 'muted', text.dataHint),
    actions,
    status,
    last,
    reminderGroup(reminderNote),
    reminderNote,
  );
  return section;
};
