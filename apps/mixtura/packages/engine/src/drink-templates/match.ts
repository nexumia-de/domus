// Matching and variants for drinks: the general matching
// (templates/match.ts, templates/variants.ts) with the base slot as the
// reference, lines measured by volume, and the alcohol class of a drink
// choosing its variants.
import type { IngredientTree, Role } from '../drink-ingredients/types';
import type { Id } from '../ingredients/types';
import { matchTemplates } from '../templates/match';
import type { TemplateEvidence } from '../templates/types';
import { volumeMeasure } from '../templates/volume';
import {
  findVariants,
  type OpenSlot as GeneralOpenSlot,
  type VariantDomain,
} from '../templates/variants';
import type { VariantsReason } from '../templates/variants';
import type { MatchOptions, MatchResult, MatchSpec, Template } from './types';

export type { VariantsReason } from '../templates/variants';

const DRINK: VariantDomain<Role, Template> = {
  referenceRole: 'base',
  variantClass: (t) => t.alcohol,
  classes: ['none', 'low'],
  replacedRole: 'base',
};

/**
 * Matches a spec to templates by roles and ratios and ranks every candidate.
 *
 * @param tree - A validated tree that gives each ingredient its role.
 * @param templates - Templates to try; slot ratios are in parts against the base slot.
 * @param spec - Lines (amounts in units of the unit table) and an optional explicit template id.
 * @param options - Unit overrides; `alcohol` (class of the drink) offers the variants of that class in place of their parents.
 * @returns Candidates best first with distance and ratios; `chosen` is the best that fits (absent if none), or the explicit id, which is never replaced.
 */
export function matchSpec(
  tree: IngredientTree,
  templates: readonly Template[],
  spec: MatchSpec,
  options: MatchOptions = {},
): MatchResult {
  return matchTemplates(
    tree,
    templates,
    spec,
    volumeMeasure(options, tree),
    DRINK,
    options.alcohol,
  );
}

/** A slot of the variant that no carried-over line fills: the user chooses an ingredient for it. */
export type OpenSlot = GeneralOpenSlot<Role>;

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
  const found = findVariants(tree, templates, spec, volumeMeasure(matching, tree), DRINK);
  const suggestions = found.variants.map(
    ({ template: v, replacedLines, keptLines, openSlots }): VariantSuggestion => ({
      templateId: v.id,
      name: v.name,
      alcohol: v.alcohol as 'none' | 'low',
      replacedLines,
      keptLines,
      openSlots,
      ...(v.slotEvidence && { evidence: v.slotEvidence }),
      ...(v.source?.name && { source: v.source.name }),
    }),
  );
  const out: VariantsResult =
    found.templateId === undefined
      ? { suggestions }
      : { templateId: found.templateId, suggestions };
  if (found.reason !== undefined) out.reason = found.reason;
  return out;
}
