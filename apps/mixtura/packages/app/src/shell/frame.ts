// Mixtura's wiring of the shared frame (`@nexumia-de/hospes/frame`): the one header, the sync icon
// with its banner, the toast. The pieces are made once and put into every redraw, so a toast keeps
// its timer and the sync button its place. The app brings the page title, the actions and the
// words; nothing of a header, banner or toast is built here.

import {
  createHeader,
  createSyncIndicator,
  createToaster,
  headerLink,
  type Toaster,
} from '@nexumia-de/hospes/frame';
import { type SyncStatus } from '@nexumia-de/hospes';
import { type AppData } from '../data';
import { destinationOf } from '../destinations';
import { type Route } from '../router';
import { type ScreenView } from '../screen';
import { strings } from '../strings';
import { nowInstant } from '../today';

/** A plain toast stays this long, one with Undo longer (a hand needs time to reach it). */
const PLAIN_MS = 5000;
const UNDO_MS = 8000;

let toaster: Toaster | undefined;

/** Says something from any screen: a toast with an optional Undo (docs/behaviour.md, "Undo, not confirm"). */
export function say(text: string, undo?: () => void): void {
  toaster?.say(text, undo && { label: strings.data.undo, run: undo });
}

const online = (): boolean => globalThis.navigator?.onLine !== false;

export interface Frame {
  /** The header and the sync banner, to put above the page. */
  top: HTMLElement[];
  /** The live region of the toast; goes into a positioned container above the page's lower edge. */
  toast: HTMLElement;
  /** Fills the header for the page shown and updates the sync icon. */
  show(page: {
    view: ScreenView;
    route: Route;
    pushed: boolean;
    onBack: () => void;
    /** The sync status of what the stock counts (stock/shown-status.ts); none: no icon. */
    status: SyncStatus | undefined;
  }): void;
}

export function createFrame(data: () => AppData): Frame {
  toaster = createToaster({ plainMs: PLAIN_MS, actionMs: UNDO_MS });
  toaster.node.dataset['testid'] = 'toast';
  const header = createHeader();
  const sync = createSyncIndicator({
    words: strings.spaces.status,
    now: nowInstant,
    bannerText: strings.sync.failedShort,
    retryLabel: strings.sync.retry,
    say: (text) => say(text),
    retry: () => data().sync.syncNow(),
  });
  sync.button.dataset['focus'] = 'sync';
  const settings = headerLink(strings.titles.settings, 'settings', '#/settings', {
    'data-focus': 'settings',
  });

  return {
    top: [header.node, sync.banner],
    toast: toaster.node,
    show({ view, route, pushed, onBack, status }) {
      sync.update(status, online());
      // What the screen offers in the header, then the sync icon and Settings.
      const here = destinationOf(route) === 'settings';
      settings.toggleAttribute('aria-current', here);
      if (here) settings.setAttribute('aria-current', 'page');
      const listAction = view.list?.action;
      listAction?.classList.toggle('wide-only', view.list?.phone === 'detail');
      header.show({
        title: view.title,
        ...(pushed && {
          back: { label: strings.back, run: onBack, attrs: { 'data-focus': 'back' } },
        }),
        ...(view.subtitle && { subtitle: view.subtitle }),
        actions: [
          ...(view.headerAction ? [view.headerAction] : []),
          ...(listAction ? [listAction] : []),
          sync.button,
          settings,
        ],
      });
    },
  };
}
