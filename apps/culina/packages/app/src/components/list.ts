// The rows of the Components list: the notebook's components, then every shipped one with its
// dish (shared/notebook-rows.ts groups and searches them). Pure: no DOM.
import type { ComponentRecord } from '../records';
import { hashFor } from '../router';
import type { NotebookRow } from '../shared/notebook-rows';
import { strings } from '../strings';
import { componentMeta } from './meta';
import { roleLabel } from './names';
import type { ShippedEntry } from './shipped';

/** Every row: the notebook's components in their order, then the shipped ones. */
export const componentRows = (
  own: readonly ComponentRecord[],
  shipped: readonly ShippedEntry[],
): NotebookRow[] => [
  ...own.map((c): NotebookRow => ({
    origin: 'own',
    id: c.id,
    name: c.name,
    meta: componentMeta(c),
    href: hashFor('components', c.id),
  })),
  ...shipped.map((s): NotebookRow => ({
    origin: 'shipped',
    id: s.key,
    name: s.name,
    meta: [
      s.role === undefined ? undefined : roleLabel(s.role),
      strings.browse.rowOrigin.shipped,
      s.dishName,
    ]
      .filter((part) => part !== undefined)
      .join(' · '),
    href: hashFor('components', s.key),
    dish: s.dishName,
  })),
];
