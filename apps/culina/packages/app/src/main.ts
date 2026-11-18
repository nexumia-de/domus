import { startNotebook, subscribe } from './notebook';
import { e2eNow } from './store/e2e-clock';
import { startRouter } from './router';
import { mountShell } from './shell/shell';
import { registerServiceWorker } from './sw-register';

const root = document.getElementById('app');
if (root) {
  const shell = mountShell(root);
  // The store is opened and read before the first screen: the screens read the notebook in memory.
  const now = e2eNow(window.location.search);
  void startNotebook(now === undefined ? {} : { now })
    .catch(() => undefined)
    .then(() => {
      subscribe(shell.refresh);
      startRouter(window, ({ route, param, action, initial }) =>
        shell.show(route, param, !initial, action),
      );
    });
  registerServiceWorker();
  if (new URLSearchParams(window.location.search).has('e2e-store')) void import('./store/e2e-hook');
}
