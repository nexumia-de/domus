// Variants of the template a spec matches: for a drink that follows a root
// template, the non-alcoholic or low-ABV variants of that template, as
// starting points. Which lines of the drink would be replaced, which carried
// over and which slots are left to fill; nothing is said about taste or
// balance (docs/templates.md#variants-by-alcohol-class).
import type { IngredientTree } from '../drink-ingredients/types';
import type { Id } from '../ingredients/types';
import type { Role } from '../drink-ingredients/types';
import { matchSpec } from './match';
import { lineRole } from './slots';
import type { MatchOptions, MatchSpec, Template, TemplateEvidence } from './types';

/** A slot of the variant that no carried-over line fills: the user chooses an ingredient for it. */
export interface OpenSlot {
  slotId: Id;
  role: Role;
  /** The template's own words about what goes there. */
  note?: string;
}

export interface VariantSuggestion {
  templateId: Id;
  name: string;
  alcohol: 'none' | 'low';
  /** Indexes of the lines of the base role: the variant replaces them. */
  replacedLines: number[];
  /** Indexes of the other lines: carried over unchanged. */
  keptLines: number[];
  /** Slots left to fill, in the variant's order. */
  openSlots: OpenSlot[];
  /** Evidence of the variant's slots, as the data states it. */
  evidence?: TemplateEvidence;
  /** Where the variant's slots come from (the template's `source.name`). */
  source?: string;
}

export type VariantsReason = 'no-template' | 'is-variant' | 'no-variant';

export interface VariantsResult {
  /** The template the spec follows (explicit or suggested), when there is one. */
  templateId?: Id;
  suggestions: VariantSuggestion[];
  /** Why `suggestions` is empty. */
  reason?: VariantsReason;
}

/**
 * The variants offered for a spec.
 *
 * @param tree - A validated tree that gives each ingredient its role.
 * @param templates - All templates, roots and variants.
 * @param spec - The spec's lines and optional explicit template id.
 * @param options - Unit overrides for matching.
 * @returns The variants of the template the spec follows (`alcohol` set, `parentId` that template); empty with a reason when the spec has no template, follows a variant already, or its template has no variant.
 */
export function variantSuggestions(
  tree: IngredientTree,
  templates: readonly Template[],
  spec: MatchSpec,
  options: MatchOptions = {},
): VariantsResult {
  const { alcohol: _ignored, ...matching } = options;
  void _ignored;
  const chosen = matchSpec(tree, templates, spec, matching).chosen;
  if (!chosen || !chosen.known) return { suggestions: [], reason: 'no-template' };
  const root = templates.find((t) => t.id === chosen.templateId);
  if (!root) return { suggestions: [], reason: 'no-template' };
  if (root.alcohol !== undefined) {
    return { templateId: root.id, suggestions: [], reason: 'is-variant' };
  }
  const roles = spec.lines.map((line) => lineRole(tree, line));
  const replaced: number[] = [];
  const kept: number[] = [];
  roles.forEach((r, i) => ('role' in r && r.role === 'base' ? replaced : kept).push(i));
  const keptRoles = new Set(
    kept.flatMap((i) => (roles[i] && 'role' in roles[i] ? [roles[i].role] : [])),
  );
  const variants = templates.filter(
    (t) => t.parentId === root.id && (t.alcohol === 'none' || t.alcohol === 'low'),
  );
  if (variants.length === 0) return { templateId: root.id, suggestions: [], reason: 'no-variant' };
  return {
    templateId: root.id,
    suggestions: variants.map((v) => ({
      templateId: v.id,
      name: v.name,
      alcohol: v.alcohol as 'none' | 'low',
      replacedLines: replaced,
      keptLines: kept,
      openSlots: v.slots
        .filter((s) => s.role === 'base' || !keptRoles.has(s.role))
        .filter((s) => s.optional !== true || s.role === 'base')
        .map((s) => ({ slotId: s.id, role: s.role, ...(s.note && { note: s.note }) })),
      ...(v.slotEvidence && { evidence: v.slotEvidence }),
      ...(v.source?.name && { source: v.source.name }),
    })),
  };
}
