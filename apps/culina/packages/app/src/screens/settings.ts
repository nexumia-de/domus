import { engineLine } from '../engine-info';
import { applyTheme, browserStore, readTheme, THEMES, writeTheme, type Theme } from '../prefs';
import { el } from '../shell/el';
import { strings } from '../strings';

const LABELS: Record<Theme, string> = {
  system: strings.settings.themeSystem,
  light: strings.settings.themeLight,
  dark: strings.settings.themeDark,
};

/** Theme as a radio group; the choice is applied at once and kept locally. */
export const settingsScreen = (): HTMLElement => {
  const store = browserStore();
  const current = readTheme(store);
  const section = el('section', 'screen');
  const note = el('p', 'note');
  note.setAttribute('role', 'status');

  const group = el('fieldset', 'choices');
  group.append(el('legend', undefined, strings.settings.themeLegend));
  for (const theme of THEMES) {
    const input = el('input');
    input.type = 'radio';
    input.name = 'theme';
    input.value = theme;
    input.checked = theme === current;
    input.addEventListener('change', () => {
      applyTheme(document.documentElement, theme);
      note.textContent = writeTheme(store, theme) ? '' : strings.settings.themeNotSaved;
    });
    const label = el('label', 'choice');
    label.append(input, el('span', undefined, LABELS[theme]));
    group.append(label);
  }

  section.append(
    el('h1', undefined, strings.settings.title),
    group,
    note,
    el('p', 'muted', strings.settings.privacy),
    el('p', 'muted', engineLine()),
  );
  return section;
};
