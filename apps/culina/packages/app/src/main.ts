import { loadContent } from './classics/content';
import { currentLang } from './classics/lang';
import { startNotebook, stockOnline, subscribe, wakeStock } from './notebook';
import { e2eNow } from './store/e2e-clock';
import { startRouter } from './router';
import { mountShell } from './shell/shell';
import { strings } from './strings';
import { registerServiceWorker } from './sw-register';

// The language of the app's own texts is chosen once, when it starts (strings.ts).
document.documentElement.lang = currentLang();
document.title = strings.appName;

const root = document.getElementById('app');
if (root) {
  const shell = mountShell(root);
  // The store is opened and read before the first screen: the screens read the notebook in memory.
  const now = e2eNow(window.location.search);
  void Promise.all([
    startNotebook(now === undefined ? {} : { now }).catch(() => undefined),
    loadContent(),
  ]).then(() => {
    subscribe(shell.refresh);
    // Stock is shared with the household: read it again when the page comes to the front.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') wakeStock();
    });
    window.addEventListener('online', stockOnline);
    startRouter(window, ({ route, param, action, initial }) =>
      shell.show(route, param, !initial, action),
    );
  });
  registerServiceWorker();
  if (new URLSearchParams(window.location.search).has('e2e-store')) void import('./store/e2e-hook');
}
