import { el } from '../shell/el';

export interface PlaceholderText {
  title: string;
  empty: string;
  guidanceSummary: string;
  guidance: string;
}

/** A screen with a heading, a short empty-state text and collapsible guidance. */
export const placeholderScreen = (text: PlaceholderText): HTMLElement => {
  const section = el('section', 'screen');
  const details = el('details', 'guidance');
  details.append(el('summary', undefined, text.guidanceSummary), el('p', undefined, text.guidance));
  section.append(el('h1', undefined, text.title), el('p', 'empty', text.empty), details);
  return section;
};
