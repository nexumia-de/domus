// Settings: which space's list is shown and how each is kept in step, the
// KitchenOwl list of the shown space, language,
// appearance, and what the app is.
import { STARTING_CATEGORIES_SOURCE } from '@emptio/engine';
import { h } from '../dom';
import { householdHref } from '../env';
import { statusText } from '../list/status';
import {
  KEYS,
  LANG_CHOICES,
  THEMES,
  applyTheme,
  langChoiceOf,
  themeOf,
  type LangChoice,
  type Theme,
} from '../prefs';
import type { Ctx, Screen } from './context';
import { kitchenowlSection } from './kitchenowl';

export function settingsScreen(ctx: Ctx): Screen {
  const { app, t, prefs } = ctx;
  const spaces = h('div', { class: 'spaces' });
  const kitchenowl = kitchenowlSection(ctx);

  function drawSpaces(): void {
    const state = app.state();
    // A radio keeps its focus while only a status changes.
    const focused = (document.activeElement as HTMLInputElement | null)?.value;
    spaces.replaceChildren(
      h(
        'fieldset',
        { class: 'choices' },
        h('legend', { class: 'form-label' }, t.settings.shown),
        ...state.spaces.map((space) => {
          const input = h('input', {
            type: 'radio',
            name: 'space',
            value: space.id,
            checked: space.id === state.space?.id,
          });
          input.addEventListener('change', () => {
            if (input.checked) void app.choose(space.id);
          });
          return h(
            'div',
            { class: 'choice' },
            h(
              'label',
              { class: 'choice-label' },
              input,
              h(
                'span',
                {},
                h('span', { class: 'choice-name' }, space.name),
                h(
                  'span',
                  { class: 'choice-status' },
                  statusText(t.status, app.status(space.id), ctx.now(), ctx.isOnline()),
                ),
              ),
            ),
            h(
              'a',
              { class: 'choice-link', href: householdHref(space.id) },
              t.settings.manage(space.name),
            ),
          );
        }),
      ),
    );
    if (focused !== undefined) {
      spaces.querySelector<HTMLElement>(`input[value="${CSS.escape(focused)}"]`)?.focus();
    }
  }

  const notKept = h('p', { class: 'notice notice-error', role: 'alert', hidden: true });
  const keep = (key: string, value: string): void => {
    notKept.hidden = prefs.set(key, value);
    notKept.textContent = t.settings.notKept;
  };

  function select<T extends string>(
    id: string,
    label: string,
    choices: readonly T[],
    words: Record<T, string>,
    current: T,
    change: (value: T) => void,
  ): HTMLElement {
    const node = h(
      'select',
      { id, class: 'field' },
      ...choices.map((c) => h('option', { value: c, selected: c === current }, words[c])),
    );
    node.addEventListener('change', () => change(node.value as T));
    return h('label', { class: 'form-field' }, h('span', { class: 'form-label' }, label), node);
  }

  const node = h(
    'div',
    { class: 'screen screen-settings' },
    h('h2', {}, t.settings.spaces),
    h('p', { class: 'muted' }, t.settings.spacesIntro),
    spaces,
    h('p', {}, h('a', { class: 'plain-link', href: householdHref() }, t.settings.household)),
    kitchenowl.node,
    h('h2', {}, t.settings.language),
    select<LangChoice>(
      'lang',
      t.settings.language,
      LANG_CHOICES,
      t.settings.langs,
      langChoiceOf(prefs.get(KEYS.lang)),
      (value) => {
        keep(KEYS.lang, value);
        // The texts are chosen once at the start; the page reads them again.
        if (notKept.hidden) window.location.reload();
      },
    ),
    h('h2', {}, t.settings.theme),
    select<Theme>(
      'theme',
      t.settings.theme,
      THEMES,
      t.settings.themes,
      themeOf(prefs.get(KEYS.theme)),
      (value) => {
        applyTheme(document.documentElement, value);
        keep(KEYS.theme, value);
      },
    ),
    notKept,
    h('h2', {}, t.settings.about),
    h('p', {}, t.settings.aboutText),
    h('p', { class: 'muted' }, t.settings.licence),
    h('p', { class: 'muted' }, `${t.settings.categoriesSource} ${STARTING_CATEGORIES_SOURCE}`),
  );
  drawSpaces();
  const update = (): void => {
    drawSpaces();
    kitchenowl.update();
  };
  return { node, title: () => t.settings.title, update };
}
