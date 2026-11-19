// Settings for the classics: the language of dishes and notes, and the skills marked as learned,
// each with "Teach again".
import { pickText } from '@culina/engine';
import { techniques } from '../classics/content';
import {
  currentLang,
  LANG_CHOICES,
  readLangChoice,
  writeLangChoice,
  type LangChoice,
} from '../classics/lang';
import { learnedSkills, setLearned } from '../notebook';
import { browserStore } from '../prefs';
import { el } from '../shell/el';
import { strings } from '../strings';
import { storeText } from './editor/store-text';

const t = strings.classics;

const LABELS: Record<LangChoice, string> = {
  device: t.contentDevice,
  en: t.contentEn,
  de: t.contentDe,
};

const languageGroup = (): HTMLElement => {
  const store = browserStore();
  const group = el('fieldset', 'choices');
  group.append(el('legend', undefined, t.contentLegend));
  const note = el('p', 'note');
  note.setAttribute('role', 'status');
  for (const choice of LANG_CHOICES) {
    const input = el('input');
    input.type = 'radio';
    input.name = 'content-lang';
    input.value = choice;
    input.checked = choice === readLangChoice(store);
    input.addEventListener('change', () => {
      note.textContent = writeLangChoice(store, choice) ? '' : t.contentNotSaved;
    });
    const label = el('label', 'choice');
    label.append(input, el('span', undefined, LABELS[choice]));
    group.append(label);
  }
  group.append(note);
  return group;
};

const skillsSection = (): HTMLElement => {
  const section = el('section', 'skills-section');
  const status = el('p', 'note-quiet');
  status.setAttribute('role', 'status');
  status.tabIndex = -1;
  const list = el('ul', 'rows skill-list');
  list.setAttribute('aria-label', t.skillsListLabel);
  const none = el('p', 'note-quiet skills-none', t.skillsNone);
  const names = new Map(techniques().map((x) => [x.id, pickText(x.name, currentLang())]));
  const draw = (): void => {
    const ids = [...learnedSkills()].sort();
    none.hidden = ids.length > 0;
    list.hidden = ids.length === 0;
    list.replaceChildren(
      ...ids.map((id) => {
        const name = names.get(id) ?? id;
        const item = el('li', 'skill-row');
        item.dataset.technique = id;
        const button = el('button', 'btn quiet', t.teachAgain);
        button.type = 'button';
        button.setAttribute('aria-label', t.teachAgainLabel(name));
        button.addEventListener('click', () => {
          void setLearned(id, false).then((done) => {
            status.textContent = done.ok ? t.taughtAgain(name) : storeText(done.error.code);
            draw();
            status.focus();
          });
        });
        item.append(el('span', 'skill-name', name), button);
        return item;
      }),
    );
  };
  draw();
  section.append(el('h2', undefined, t.skillsHeading), none, list, status);
  return section;
};

/** The two parts of the settings that belong to the classics. */
export const classicsSettings = (): HTMLElement[] => [languageGroup(), skillsSection()];
