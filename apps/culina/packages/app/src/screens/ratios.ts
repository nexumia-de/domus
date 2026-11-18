// The Ratios screen: the list, and the card of one template. On a phone the card is its own
// screen; from 720 px the list stays beside it (CSS only, the same markup).
import { resolveTemplate, SEED_TEMPLATES } from '@culina/engine';
import { el } from '../shell/el';
import { strings } from '../strings';
import { ratioCard } from './ratio-card';
import { ratioList, type ListState } from './ratio-list';

/** The search text survives navigation between the list and the cards. */
const state: ListState = { query: '' };

export const ratiosScreen = (param?: string): HTMLElement => {
  const templates = SEED_TEMPLATES;
  const template = param === undefined ? undefined : templates.find((t) => t.id === param);
  const resolved = template === undefined ? undefined : resolveTemplate(templates, template.id);
  const screen = el('section', 'screen ratios split');
  if (template === undefined || resolved === undefined || !resolved.ok) {
    const note = param === undefined ? undefined : strings.ratios.unknownRatio;
    const list = ratioList(
      templates,
      state,
      note === undefined ? { asHeading: true } : { asHeading: true, note },
    );
    screen.append(list, el('p', 'pane-empty muted', strings.ratios.chooseOne));
    return screen;
  }
  screen.classList.add('has-card', 'has-detail');
  screen.append(
    ratioList(templates, state, { asHeading: false, current: template.id }),
    ratioCard(templates, template, resolved.template),
  );
  return screen;
};
