// Search of the ratio list: case-insensitive substring of the name.
import type { RatioTemplate } from '@culina/engine';

/** Templates whose name contains the trimmed query, ignoring case; an empty query keeps all. */
export const filterTemplates = (
  templates: readonly RatioTemplate[],
  query: string,
): RatioTemplate[] => {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...templates];
  return templates.filter((t) => t.name.toLowerCase().includes(needle));
};
