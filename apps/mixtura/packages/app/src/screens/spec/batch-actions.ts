// What the batch sheet's controls do: every choice rewrites the address
// (`servings`, `volume`, `sheet=batch`) in place, so the sheet stays one
// history entry and Back closes it (docs/screens-specs.md#servings-and-batch).

import type { AppState } from '../../app-state';
import type { BatchActions } from '../../components/batch-controls';
import { back, replace } from '../../navigation';
import type { Route } from '../../router';
import type { Store } from '../../state';
import { specAddress } from './servings';

export function batchActions(
  store: Store<AppState>,
  route: Route,
  servings: number,
  wide: boolean,
): BatchActions {
  return {
    close() {
      const without = specAddress(route, servings, null);
      if (wide) replace(store, without);
      else back(store, without);
    },
    setDrinks: (n) => replace(store, specAddress(route, n, 'batch')),
    setVolume: (ml) => replace(store, specAddress(route, servings, 'batch', ml)),
    useVolume: (ml) => replace(store, specAddress(route, servings, 'batch', ml)),
    useDrinks: () => replace(store, specAddress(route, servings, 'batch')),
  };
}
