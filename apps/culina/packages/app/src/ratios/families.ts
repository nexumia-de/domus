// Families of ratio templates: grouping by the root of the lineage, and the relatives of one template.
import { resolveTemplate, templateAncestors, templateChildren } from '@culina/engine';
import type { RatioTemplate } from '@culina/engine';
import { templateName } from './names';

export interface Family {
  rootId: string;
  /** The root's name. */
  name: string;
  /** The root first, then its variations in the order of the input. */
  members: RatioTemplate[];
}

/** The root of a template's lineage; a template whose chain cannot be resolved is its own root. */
const rootOf = (templates: readonly RatioTemplate[], template: RatioTemplate): string => {
  const resolved = resolveTemplate(templates, template.id);
  return (resolved.ok ? resolved.template.lineage[0] : undefined) ?? template.id;
};

/** Groups templates by the root of their lineage; families in the order of their first member. */
export const groupFamilies = (templates: readonly RatioTemplate[]): Family[] => {
  const byId = new Map(templates.map((t) => [t.id, t] as const));
  const groups = new Map<string, RatioTemplate[]>();
  for (const template of templates) {
    const rootId = rootOf(templates, template);
    groups.set(rootId, [...(groups.get(rootId) ?? []), template]);
  }
  return [...groups].map(([rootId, members]) => ({
    rootId,
    name: templateName(byId.get(rootId) ?? members[0] ?? { id: rootId, name: rootId }),
    members: [...members.filter((m) => m.id === rootId), ...members.filter((m) => m.id !== rootId)],
  }));
};

export interface Relatives {
  parent?: RatioTemplate;
  /** Direct variations, in the order of the input. */
  children: RatioTemplate[];
}

/** The parent and the direct variations of a template; none for an unknown id. */
export const relatives = (templates: readonly RatioTemplate[], id: string): Relatives => {
  const byId = new Map(templates.map((t) => [t.id, t] as const));
  const ancestors = templateAncestors(templates, id);
  const parent =
    ancestors.ok && ancestors.ids[0] !== undefined ? byId.get(ancestors.ids[0]) : undefined;
  const children = templateChildren(templates, id).flatMap((childId) => byId.get(childId) ?? []);
  return parent === undefined ? { children } : { parent, children };
};
