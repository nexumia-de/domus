import { startRouter } from './router';
import { mountShell } from './shell/shell';
import { registerServiceWorker } from './sw-register';

const root = document.getElementById('app');
if (root) {
  const shell = mountShell(root);
  startRouter(window, ({ route, param, initial }) => shell.show(route, param, !initial));
  registerServiceWorker();
  if (new URLSearchParams(window.location.search).has('e2e-store')) void import('./store/e2e-hook');
}
