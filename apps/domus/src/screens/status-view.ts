import { h } from '../dom';
import type { Problem } from '../logic/failures';
import { ago, spaceState, lastFailure } from '../logic/status';
import { failureText } from '../logic/words';
import type { Strings } from '../strings';

/** The state of a space's last cycle as short lines: in step, never, or failed with the reason. */
export function statusView(
  t: Strings,
  storageType: string,
  syncedAt: string | undefined,
  id: string,
  now: string,
  override?: Problem,
): HTMLElement {
  const last = override ? { at: now, problem: override } : lastFailure(id);
  const state = spaceState(syncedAt, last);
  const wrap = h('div', {
    class: `status ${state.kind}`,
    'data-testid': 'status',
    'data-state': state.kind,
  });
  if (state.kind === 'never') wrap.append(h('p', { class: 'status-line' }, t.status.never));
  else if (state.kind === 'in-step')
    wrap.append(h('p', { class: 'status-line' }, t.status.inStep(ago(t, state.at, now))));
  else
    wrap.append(
      h('p', { class: 'status-line' }, t.status.failed),
      h('p', { class: 'status-reason' }, failureText(t, state.problem, storageType)),
    );
  return wrap;
}
