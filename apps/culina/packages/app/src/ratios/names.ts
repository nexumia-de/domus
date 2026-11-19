// How a ratio is named on screen. The shipped ratios have their names and notes in the strings (UI
// vocabulary, English and German); a ratio of the user's own is shown as typed. The role words
// ("flour", "water") come from the roles map of the strings, so every place that prints a ratio
// speaks the user's language. The source of a card is its references (author, title, page), never the
// repository pointer in `source`.
import type { RatioTemplate } from '@culina/engine';
import { roleLabel } from '../components/names';
import { strings } from '../strings';

const seed = (id: string) => strings.ratios.seed[id];

/** The name of a template: the shipped ones in the user's language, the user's own as typed. */
export const templateName = (template: Pick<RatioTemplate, 'id' | 'name'>): string =>
  seed(template.id)?.name ?? template.name;

/** The note of a template, when it has one worth showing; a shipped one is in the strings. */
export const templateNote = (template: Pick<RatioTemplate, 'id' | 'note'>): string | undefined =>
  seed(template.id) === undefined ? template.note : seed(template.id)?.note;

/** "Source: Michael Ruhlman, Ratio, p. 17"; nothing for a ratio without references. */
export const templateSource = (template: Pick<RatioTemplate, 'references'>): string | undefined => {
  const list = (template.references ?? []).map((r) =>
    strings.ratios.reference(r.author, r.title, r.page),
  );
  return list.length === 0 ? undefined : strings.ratios.sourceLine(list.join('; '));
};

/** A role word of a ratio in the user's language. */
export const ratioRole = (role: string): string => roleLabel(role);
