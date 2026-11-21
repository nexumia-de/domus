import { adapterFor, createIdbStore } from '@nexumia-de/hospes';
import {
  createHeader,
  createSyncIndicator,
  createToaster,
  drawIcon,
  headerLink,
} from '@nexumia-de/hospes/frame';
import { createApp } from './app';
import { h } from './dom';
import { GITHUB_API } from './env';
import { CATEGORIES_ICON } from './icons';
import { KEYS, browserPrefs, langChoiceOf, langFor } from './prefs';
import { hashFor, parseHash, type Route } from './router';
import { categoriesScreen } from './screens/categories';
import type { Ctx, Screen } from './screens/context';
import { entryScreen } from './screens/entry';
import { listScreen } from './screens/list';
import { settingsScreen } from './screens/settings';
import { stringsEn } from './strings';
import { stringsDe } from './strings-de';
import { registerServiceWorker } from './sw-register';

const prefs = browserPrefs();
const lang = langFor(langChoiceOf(prefs.get(KEYS.lang)), globalThis.navigator?.languages ?? []);
const t = lang === 'de' ? stringsDe : stringsEn;
document.documentElement.lang = lang;
document.title = t.appName;

const root = document.getElementById('app');
if (root) {
  const now = (): string => new Date().toISOString();
  const isOnline = (): boolean => navigator.onLine !== false;
  const app = createApp({
    store: createIdbStore(),
    now,
    newId: () => `e-${crypto.randomUUID()}`,
    prefs,
    names: { home: t.space.home, unnamed: t.space.unnamed },
    adapter: (storage) => adapterFor(storage, { apiBase: GITHUB_API }),
    isVisible: () => document.visibilityState !== 'hidden',
    isOnline,
  });

  // What was said last: a short toast over the lower edge of the content, with Undo where there
  // is one; for screen readers it is a live region.
  const toaster = createToaster();
  const ctx: Ctx = {
    app,
    t,
    lang,
    prefs,
    now,
    isOnline,
    say: (text, undo) => toaster.say(text, undo),
    go(hash) {
      window.location.hash = hash;
    },
  };

  const main = h('main', { id: 'main', class: 'app-main', tabindex: '-1' });
  const skip = h('a', { class: 'skip-link', href: '#main' }, t.skip);
  skip.addEventListener('click', (event) => {
    // The hash is the route, so move the focus instead of navigating.
    event.preventDefault();
    main.focus();
  });
  const header = createHeader();
  const sync = createSyncIndicator({
    words: t.status,
    now,
    retryLabel: t.status.retry,
    say: (text) => ctx.say(text),
    retry: () => app.wake(),
  });
  const settingsLink = headerLink(t.nav.settings, 'settings', hashFor.settings);
  const categoriesLink = headerLink(
    t.nav.categories,
    drawIcon(CATEGORIES_ICON),
    hashFor.categories,
  );
  // What a screen keeps in reach of the thumb: the add field. The only permanent thing below.
  const dock = h('div', { class: 'app-dock' });
  // The frame fills the window; only `main` scrolls, so header and dock stay.
  root.classList.add('app-frame');
  root.append(
    skip,
    h('div', { class: 'app-top' }, header.node, sync.banner),
    h('div', { class: 'app-body' }, main, toaster.node),
    dock,
  );

  const screenFor = (route: Route): Screen => {
    switch (route.name) {
      case 'list':
        return listScreen(ctx);
      case 'entry':
        return entryScreen(ctx, route.id);
      case 'categories':
        return categoriesScreen(ctx);
      case 'settings':
        return settingsScreen(ctx);
    }
  };

  let screen: Screen | undefined;
  let route: Route = parseHash(window.location.hash);

  /** With more than one space the list says which one it shows, and switches. */
  function spaceSwitch(): HTMLElement | undefined {
    const { space, spaces } = app.state();
    if (route.name !== 'list' || space === undefined || spaces.length < 2) return undefined;
    const select = h(
      'select',
      { class: 'space-select', 'aria-label': t.list.listOf },
      ...spaces.map((s) => h('option', { value: s.id, selected: s.id === space.id }, s.name)),
    );
    select.addEventListener('change', () => void app.choose(select.value));
    return select;
  }

  /** The header says where we are and what can be done here; the sync icon follows the state. */
  function drawHeader(): void {
    const focused = document.activeElement?.classList.contains('space-select') === true;
    const state = app.state();
    sync.update(state.space ? app.status(state.space.id) : undefined, isOnline());
    if (focused) return;
    const subtitle = spaceSwitch();
    header.show({
      title: screen?.title() ?? t.appName,
      ...(route.name === 'list' ? {} : { back: { href: hashFor.list, label: t.nav.back } }),
      ...(subtitle ? { subtitle } : {}),
      actions: [sync.button, ...(route.name === 'list' ? [categoriesLink] : []), settingsLink],
    });
    categoriesLink.toggleAttribute('aria-current', false);
    settingsLink.toggleAttribute('aria-current', false);
    const here =
      route.name === 'categories'
        ? categoriesLink
        : route.name === 'settings'
          ? settingsLink
          : null;
    here?.setAttribute('aria-current', 'page');
  }

  function show(focusHeading: boolean): void {
    route = parseHash(window.location.hash);
    screen = screenFor(route);
    main.replaceChildren(screen.node);
    dock.replaceChildren(...(screen.dock ? [screen.dock] : []));
    drawHeader();
    const name = screen.title();
    document.title = route.name === 'list' ? t.appName : `${name} - ${t.appName}`;
    if (focusHeading) {
      header.heading.tabIndex = -1;
      header.heading.focus();
    }
    main.scrollTop = 0;
  }

  window.addEventListener('hashchange', () => show(true));
  app.subscribe(() => {
    screen?.update();
    drawHeader();
  });
  window.addEventListener('online', () => app.wake());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') app.wake();
  });
  show(false);
  void app.load();
  registerServiceWorker();
}
