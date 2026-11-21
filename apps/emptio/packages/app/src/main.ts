import { adapterFor, createIdbStore } from '@nexumia-de/hospes';
import { createApp } from './app';
import { button, h } from './dom';
import { GITHUB_API } from './env';
import { icon } from './icons';
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

  // What was said last, for screen readers and for the eye; an Undo lives as long as the line.
  const live = h('div', { class: 'live', role: 'status', 'aria-live': 'polite' });
  let liveTimer: ReturnType<typeof setTimeout> | undefined;
  const ctx: Ctx = {
    app,
    t,
    lang,
    prefs,
    now,
    isOnline,
    say(text, undo) {
      clearTimeout(liveTimer);
      live.replaceChildren(h('span', {}, text));
      if (undo) {
        live.append(
          button(undo.label, () => {
            live.replaceChildren();
            undo.run();
          }),
        );
      }
      liveTimer = setTimeout(() => live.replaceChildren(), undo ? 10_000 : 5_000);
    },
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
  const header = h(
    'header',
    { class: 'app-header' },
    h('a', { class: 'app-title', href: hashFor.list }, t.appName),
  );
  // The destinations: a bar at the bottom on a phone, a rail at the side on a wide screen.
  const links = (
    [
      ['list', hashFor.list, t.nav.list],
      ['categories', hashFor.categories, t.nav.categories],
      ['settings', hashFor.settings, t.nav.settings],
    ] as const
  ).map(([name, href, label]) => ({
    name,
    node: h('a', { class: 'nav-link', href }, icon(name), h('span', { class: 'nav-label' }, label)),
  }));
  const nav = h(
    'nav',
    { class: 'app-nav', 'aria-label': t.appName },
    ...links.map((link) => link.node),
  );
  // What a screen keeps in reach of the thumb, above the navigation (the add field).
  const dock = h('div', { class: 'app-dock' });
  // The frame fills the window; only `main` scrolls, so header, dock and navigation stay.
  root.classList.add('app-frame');
  root.append(skip, header, h('div', { class: 'app-body' }, main, live), dock, nav);

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
  function show(focusHeading: boolean): void {
    const route = parseHash(window.location.hash);
    screen = screenFor(route);
    main.replaceChildren(screen.node);
    dock.replaceChildren(...(screen.dock ? [screen.dock] : []));
    // An entry is a page of the list.
    const at = route.name === 'entry' ? 'list' : route.name;
    for (const link of links) {
      if (link.name === at) link.node.setAttribute('aria-current', 'page');
      else link.node.removeAttribute('aria-current');
    }
    const heading = screen.node.querySelector('h1');
    const name = heading?.textContent ?? '';
    document.title = name === '' || name === t.appName ? t.appName : `${name} - ${t.appName}`;
    if (heading && focusHeading) {
      heading.tabIndex = -1;
      heading.focus();
    }
    main.scrollTop = 0;
  }

  window.addEventListener('hashchange', () => show(true));
  app.subscribe(() => screen?.update());
  window.addEventListener('online', () => app.wake());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') app.wake();
  });
  show(false);
  void app.load();
  registerServiceWorker();
}
