import { shouldRegister } from '@nexumia-de/hospes/service-worker';

export const registerServiceWorker = (): void => {
  if (!shouldRegister(window.location, 'serviceWorker' in navigator)) return;
  // Relative to the page: the app is served from a folder of the address.
  void navigator.serviceWorker.register('sw.js').catch(() => undefined);
};
