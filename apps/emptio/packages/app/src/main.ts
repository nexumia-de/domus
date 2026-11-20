import { adapterFor, createIdbStore } from '@nexumia-de/hospes';
import { createApp } from './app';
import { button, h } from './dom';
import { GITHUB_API } from './env';
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
    h(
      'nav',
      { class: 'app-nav', 'aria-label': t.appName },
      h('a', { href: hashFor.categories }, t.nav.categories),
      h('a', { href: hashFor.settings }, t.nav.settings),
    ),
  );
  root.append(skip, header, main, live);

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
    screen = screenFor(parseHash(window.location.hash));
    main.replaceChildren(screen.node);
    const heading = screen.node.querySelector('h1');
    const name = heading?.textContent ?? '';
    document.title = name === '' || name === t.appName ? t.appName : `${name} - ${t.appName}`;
    if (heading && focusHeading) {
      heading.tabIndex = -1;
      heading.focus();
    }
    window.scrollTo(0, 0);
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
