import { realDeps } from './deps';
import { h } from './dom';
import { currentLang, stringsFor } from './lang';
import { parseHash, type Route } from './router';
import { accessScreen } from './screens/access';
import type { Ctx } from './screens/context';
import { createScreen } from './screens/create';
import { displayFooter } from './screens/display';
import { homeScreen } from './screens/home';
import { inviteScreen } from './screens/invite';
import { joinScreen } from './screens/join';
import { spaceScreen } from './screens/space';

const lang = currentLang();
const t = stringsFor(lang);
document.documentElement.lang = lang;
document.title = t.appName;

const root = document.getElementById('app');
if (root) {
  const ctx: Ctx = {
    t,
    lang,
    deps: realDeps(),
    base: () => `${window.location.origin}${window.location.pathname}`,
    go: (hash, replace = false) => {
      if (replace) {
        window.history.replaceState(null, '', hash);
        render(false);
      } else window.location.hash = hash;
    },
    flash: { text: undefined },
  };

  const skip = h('a', { class: 'skip-link', href: '#main' }, t.skip);
  const main = h('main', { id: 'main', class: 'app-main', tabindex: '-1' });
  skip.addEventListener('click', (event) => {
    // The hash is the route, so move focus instead of navigating.
    event.preventDefault();
    main.focus();
  });
  const header = h(
    'header',
    { class: 'app-header' },
    h('a', { class: 'app-title', href: '#/' }, t.appName),
  );
  root.append(skip, header, main, displayFooter(t));

  const screenFor = (route: Route): HTMLElement => {
    switch (route.name) {
      case 'home':
        return homeScreen(ctx);
      case 'new':
        return createScreen(ctx);
      case 'space':
        return spaceScreen(ctx, route.id);
      case 'invite':
        return inviteScreen(ctx, route.id);
      case 'access':
        return accessScreen(ctx, route.id);
      case 'join':
        return joinScreen(ctx, route.fragment);
    }
  };

  function render(focusHeading: boolean): void {
    const screen = screenFor(parseHash(window.location.hash));
    main.replaceChildren(screen);
    const heading = screen.querySelector('h1');
    const name = heading?.textContent ?? '';
    document.title = name === '' || name === t.appName ? t.appName : `${name} - ${t.appName}`;
    if (heading) {
      heading.tabIndex = -1;
      if (focusHeading) heading.focus();
    }
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', () => render(true));
  render(false);
}
