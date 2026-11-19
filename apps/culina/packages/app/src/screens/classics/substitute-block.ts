// "Instead" on an ingredient line: a quiet button that opens, under the line, what can replace the
// ingredient and what changes, each with its level and sources behind a tap. Reference knowledge:
// always offered, never fades, no "I know this".
import type { Lang } from '@culina/engine';
import { substitutes } from '../../classics/content';
import type { LineView, NameOf } from '../../classics/dish-view';
import { substituteItems } from '../../classics/substitute-view';
import { catalogueTree } from '../../classics/tree';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { noteCard } from './technique-note';

const t = strings.classics;

/** What a line adds below itself: the button and its closed panel, or nothing. */
export type LineExtra = (line: LineView) => HTMLElement[];

let counter = 0;

/** The extra of a line for a language: "Instead" when the ingredient has substitutes. */
export const insteadFor =
  (lang: Lang, nameOf: NameOf): LineExtra =>
  (line) => {
    if (line.ingredient === undefined) return [];
    const items = substituteItems(line.ingredient, catalogueTree(), substitutes(), lang, nameOf);
    if (items.length === 0) return [];
    const panel = el('div', 'substitute-panel');
    panel.id = `substitute-${(counter += 1)}`;
    panel.hidden = true;
    // The cards are built at the first tap, so a recipe full of lines stays light.
    const fill = (): void =>
      panel.append(
        ...items.map((item) => {
          const card = noteCard('substitute', {
            heading: item.name,
            ...(item.factor === undefined ? {} : { lead: item.factor }),
            text: item.changes,
            level: item.level,
            sources: item.sources,
          });
          card.dataset.substitute = item.id;
          return card;
        }),
      );
    const button = el('button', 'btn quiet line-instead', t.insteadButton);
    button.type = 'button';
    button.setAttribute('aria-label', t.insteadLabel(line.name));
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', panel.id);
    button.addEventListener('click', () => {
      if (panel.childElementCount === 0) fill();
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
    });
    return [button, panel];
  };
