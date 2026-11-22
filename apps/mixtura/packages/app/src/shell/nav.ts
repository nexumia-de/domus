import { type AppState } from '../app-state';
import { destinationOf, destinations } from '../destinations';
import { h } from '../dom';
import { strings } from '../strings';

/** Bottom navigation on a phone, rail from 840 px (CSS decides). */
export function nav(state: AppState): HTMLElement {
  const active = destinationOf(state.route);
  return h(
    'nav',
    { class: 'nav', 'aria-label': strings.navLabel },
    ...destinations
      .filter((dest) => dest.inBar)
      .map((dest) => {
        const isActive = dest.id === active;
        // The active destination pops its stack to the list; others reopen where they were left.
        const href = isActive ? dest.root : (state.lastRoute[dest.id] ?? dest.root);
        return h(
          'a',
          { href, 'aria-current': isActive ? 'page' : undefined, 'data-focus': `nav-${dest.id}` },
          h('span', { class: 'nav-pill' }, dest.icon?.()),
          dest.label,
        );
      }),
  );
}
