// Keeps the screen awake while a screen that needs it is shown (cooking step by step), where the
// Wake Lock API exists; silently nothing where it does not or where the browser refuses.
interface Sentinel {
  release(): Promise<void>;
  addEventListener(type: 'release', listener: () => void): void;
}
interface WakeLockHost {
  wakeLock?: { request(type: 'screen'): Promise<Sentinel> };
}

/**
 * Requests the lock now and gives it up when `owner` is no longer on the page (the next route) or
 * asks again when the page becomes visible. Lost locks (a hidden tab) are requested again.
 *
 * @param owner - The screen's root element; the lock follows its presence.
 */
export const keepAwake = (owner: HTMLElement): void => {
  const api = (globalThis.navigator as (Navigator & WakeLockHost) | undefined)?.wakeLock;
  if (api === undefined) return;
  let lock: Sentinel | undefined;
  const acquire = (): void => {
    if (lock !== undefined) return;
    api
      .request('screen')
      .then((got) => {
        lock = got;
        got.addEventListener('release', () => {
          if (lock === got) lock = undefined;
        });
      })
      .catch(() => undefined);
  };
  const stop = (): void => {
    document.removeEventListener('visibilitychange', onChange);
    window.removeEventListener('hashchange', onChange);
    void lock?.release().catch(() => undefined);
    lock = undefined;
  };
  const onChange = (): void => {
    if (!owner.isConnected) stop();
    else if (document.visibilityState === 'visible') acquire();
  };
  document.addEventListener('visibilitychange', onChange);
  window.addEventListener('hashchange', onChange);
  acquire();
};
