// The sync status in the header: a small icon button (state as icon, accessible name and
// tooltip) whose tap says the details, and a slim banner with Retry that exists only on an
// error. Replaces the status line under the title.
import type { SyncStatus } from '../collection-sync';
import { statusText, type StatusWords } from '../status-text';
import { drawIcon, el } from './dom';
import { FRAME_ICONS } from './icons';
import { syncDisplay, type SyncDisplay } from './sync-display';

export interface SyncIndicatorOptions {
  words: StatusWords;
  /** The current time, read when the details are asked for, so that "2 min ago" is right. */
  now: () => string;
  /** The banner's one short line ("Sync failed"); the reason is in the details of the icon. */
  bannerText: string;
  retryLabel: string;
  /** Shows the details ("Synced 2 min ago") as a toast. */
  say: (text: string) => void;
  /** The banner's Retry. */
  retry: () => void;
}

export interface SyncIndicator {
  button: HTMLButtonElement;
  banner: HTMLElement;
  /** `status` undefined: no space is shown; the button is hidden. */
  update(status: SyncStatus | undefined, online: boolean): void;
}

export function createSyncIndicator(options: SyncIndicatorOptions): SyncIndicator {
  const { words } = options;
  const button = el('button', { class: 'fr-icon-btn fr-sync', type: 'button' });
  const bannerText = el('span', { class: 'fr-banner-text' }, options.bannerText);
  const retry = el('button', { class: 'fr-banner-action', type: 'button' }, options.retryLabel);
  retry.addEventListener('click', options.retry);
  const banner = el('div', { class: 'fr-banner', role: 'alert', hidden: true }, bannerText, retry);
  let shown: { status: SyncStatus | undefined; online: boolean } = {
    status: undefined,
    online: true,
  };
  let current: SyncDisplay | undefined;

  const text = (): string => statusText(words, shown.status, options.now(), shown.online);
  button.addEventListener('click', () => {
    const details = text();
    button.setAttribute('aria-label', details);
    button.title = details;
    options.say(details);
  });

  return {
    button,
    banner,
    update(status, online) {
      shown = { status, online };
      button.hidden = status === undefined;
      const state = syncDisplay(status, online);
      const label = text();
      button.setAttribute('aria-label', label);
      button.title = label;
      button.dataset.sync = state;
      if (state !== current) {
        current = state;
        button.replaceChildren(drawIcon(FRAME_ICONS[state]));
      }
      banner.hidden = state !== 'failed';
    },
  };
}
