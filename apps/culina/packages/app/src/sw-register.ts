/** Registers the service worker over http(s) only, and not when the page URL has `?no-sw`. */
export const shouldRegister = (
  location: { protocol: string; search: string },
  hasServiceWorker: boolean,
): boolean =>
  hasServiceWorker &&
  (location.protocol === 'https:' || location.protocol === 'http:') &&
  !new URLSearchParams(location.search).has('no-sw');

export const registerServiceWorker = (): void => {
  if (!shouldRegister(window.location, 'serviceWorker' in navigator)) return;
  // Relative to the page, so the app works from a sub-path.
  void navigator.serviceWorker.register('sw.js').catch(() => undefined);
};
