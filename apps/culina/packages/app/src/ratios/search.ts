// Search of the ratio list: the shared search by name.
import type { RatioTemplate } from '@culina/engine';
import { filterByName } from '../shared/search';
import { templateName } from './names';

/** Templates whose name contains the trimmed query, ignoring case; an empty query keeps all. */
export const filterTemplates = (
  templates: readonly RatioTemplate[],
  query: string,
): RatioTemplate[] =>
  filterByName(
    templates.map((t) => ({ template: t, name: templateName(t) })),
    query,
  ).map((x) => x.template);
