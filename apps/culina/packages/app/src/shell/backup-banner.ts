// The backup reminder: one quiet line above the screen, with a link to Settings and "Not now".
// Never a dialog; it shows only when the notebook has changes that no export holds and the
// period the user chose has passed (exchange/reminder.ts).
import { readLastExport, readReminderDays } from '../exchange/backup-prefs';
import { changeSpan } from '../exchange/changes';
import { reminderDue } from '../exchange/reminder';
import { state } from '../notebook/state';
import { hashFor } from '../router';
import { strings } from '../strings';
import { el } from './el';

const banner = el('aside', 'backup-banner');
banner.setAttribute('aria-label', strings.backup.action);
banner.hidden = true;
let dismissed = false;
let sequence = 0;

export const backupBanner = (): HTMLElement => banner;

/** Looks at the store and the clock again and shows or hides the banner. */
export async function refreshBackupBanner(): Promise<void> {
  const mine = ++sequence;
  const store = state.store;
  let due: ReturnType<typeof reminderDue>;
  if (store !== undefined && !dismissed) {
    const lastExport = readLastExport();
    due = reminderDue({
      now: state.now(),
      ...(lastExport === undefined ? {} : { lastExport }),
      span: await changeSpan(store),
      days: readReminderDays(),
    });
  }
  if (mine !== sequence) return;
  if (due === undefined) {
    banner.hidden = true;
    banner.replaceChildren();
    return;
  }
  const text = el(
    'p',
    'backup-text',
    due.sinceExport === null ? strings.backup.dueNever : strings.backup.due(due.sinceExport),
  );
  const link = el('a', 'btn', strings.backup.action);
  link.href = hashFor('settings');
  const later = el('button', 'btn quiet', strings.backup.later);
  later.type = 'button';
  later.addEventListener('click', () => {
    dismissed = true;
    banner.hidden = true;
  });
  const actions = el('div', 'actions');
  actions.append(link, later);
  banner.replaceChildren(text, actions);
  banner.hidden = false;
}
