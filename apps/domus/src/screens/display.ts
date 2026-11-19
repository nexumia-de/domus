// The language and theme choices in the footer of every page. A new language reloads the page,
// because the app's texts are chosen once when it starts.
import { h } from '../dom';
import {
  LANG_CHOICES,
  THEMES,
  applyTheme,
  browserStore,
  parseLangChoice,
  parseTheme,
  readLangChoice,
  readTheme,
  writeLangChoice,
  writeTheme,
} from '../prefs';
import type { Strings } from '../strings';
import { uid } from './parts';

export function displayFooter(t: Strings): HTMLElement {
  const store = browserStore();
  const note = h('p', { class: 'hint', role: 'status' });

  const select = (
    label: string,
    values: readonly string[],
    names: Record<string, string>,
    current: string,
  ) => {
    const id = uid('d');
    const input = h('select', { id });
    for (const value of values) {
      const option = h('option', { value }, names[value] ?? value);
      option.selected = value === current;
      input.append(option);
    }
    return {
      wrap: h('div', { class: 'field inline' }, h('label', { for: id }, label), input),
      input,
    };
  };

  const lang = select(
    t.display.language,
    LANG_CHOICES,
    { device: t.display.langDevice, en: t.display.langEn, de: t.display.langDe },
    readLangChoice(store),
  );
  lang.input.addEventListener('change', () => {
    const kept = writeLangChoice(store, parseLangChoice(lang.input.value));
    if (kept) window.location.reload();
    else note.textContent = t.display.notSaved;
  });

  const theme = select(
    t.display.theme,
    THEMES,
    { system: t.display.themeSystem, light: t.display.themeLight, dark: t.display.themeDark },
    readTheme(store),
  );
  theme.input.addEventListener('change', () => {
    const choice = parseTheme(theme.input.value);
    applyTheme(document.documentElement, choice);
    if (!writeTheme(store, choice)) note.textContent = t.display.notSaved;
  });

  return h(
    'footer',
    { class: 'app-footer' },
    h(
      'div',
      { class: 'display', role: 'group', 'aria-label': t.display.legend },
      lang.wrap,
      theme.wrap,
    ),
    note,
  );
}
