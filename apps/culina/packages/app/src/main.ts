import { startRouter } from './router';
import { mountShell } from './shell/shell';
import { registerServiceWorker } from './sw-register';

const root = document.getElementById('app');
if (root) {
  const shell = mountShell(root);
  startRouter(window, ({ route, initial }) => shell.show(route, !initial));
  registerServiceWorker();
}
