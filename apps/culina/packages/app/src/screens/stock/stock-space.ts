// The part of the Stock screen that says whose stock it is and how it is kept in step: the used
// space (a choice when the device has more than one), its sync status in a few words, and the
// way to the Household app, where spaces are made, shared and given a storage.
import {
  chooseStockSpace,
  onStockStatus,
  stockSpaces,
  stockStatus,
  type SyncStatus,
} from '../../notebook';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { selectField } from '../fields';

const t = strings.stock;

type Reason = keyof typeof t.status.reasons;

/** The words for a failure of the host's cycle; anything else is a file that could not be read. */
const REASONS: Readonly<Record<string, Reason>> = {
  unauthorised: 'access',
  'not-found': 'notFound',
  unreachable: 'unreachable',
  blocked: 'wait',
  conflict: 'conflict',
  storage: 'storage',
  'wrong-key': 'otherSpace',
  'newer-version': 'newer',
};

/** The status in a few words; empty while nothing is known. */
export const statusText = (status: SyncStatus | undefined): string => {
  switch (status?.kind) {
    case 'device-only':
      return t.status.deviceOnly;
    case 'never':
      return t.status.never;
    case 'syncing':
      return t.status.syncing;
    case 'in-step':
      return t.status.inStep;
    case 'failed':
      return t.status.notInStep(t.status.reasons[REASONS[status.failure] ?? 'unreadable']);
    default:
      return '';
  }
};

export const stockSpaceSection = (): HTMLElement | undefined => {
  const { spaces, used } = stockSpaces();
  if (used === undefined) return undefined;
  const box = el('section', 'stock-space');
  if (spaces.length > 1) {
    const choice = selectField(
      t.spaceLabel,
      spaces.map((space) => ({ value: space.id, label: space.name })),
      used.id,
    );
    choice.control.addEventListener('change', () => void chooseStockSpace(choice.control.value));
    box.append(choice.wrap);
  } else {
    box.append(el('p', 'stock-space-name', `${t.spaceLabel} ${used.name}`));
  }
  const status = el('p', 'note-quiet stock-sync', statusText(stockStatus()));
  status.setAttribute('role', 'status');
  const stop = onStockStatus(() => {
    if (!status.isConnected) return stop();
    status.textContent = statusText(stockStatus());
  });
  // The Household app is at the root of the address; it opens the space that is used.
  const household = el('a', 'btn quiet new-link stock-household', t.household);
  household.href = `../#/spaces/${encodeURIComponent(used.id)}`;
  box.append(status, el('p', 'note-quiet', t.spaceHint), household);
  return box;
};
