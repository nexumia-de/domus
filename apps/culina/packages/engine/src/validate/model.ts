// Cross-record validation of the whole model: what the JSON Schemas cannot
// check because it spans records. Pure; collects every finding and never throws.
import { affinityFindings } from './affinities';
import { componentFindings } from './components';
import type { Known } from './common';
import { dishFindings } from './dishes';
import { ingredientFindings } from './ingredients';
import { stockFindings } from './stock';
import { templateFindings } from './templates';
import type { ModelInput, ValidationResult } from './types';

const idsOf = (records: readonly { id: string }[] = []): Set<string> =>
  new Set(records.map((r) => r.id));

/**
 * Checks references, cycles, template anchors and ranges across records.
 * Only the records given count as existing: a collection left out is empty,
 * so pass seed and user records together.
 *
 * @param model - The collections of the export file, as stored.
 * @returns `ok` and every finding, ordered by collection (ingredients, templates, components, dishes, stock, affinities), then record order, then field order. A later record with an id already used in its collection gets only `duplicate-id`.
 */
export function validateModel(model: ModelInput): ValidationResult {
  const known: Known = {
    ingredients: idsOf(model.ingredients),
    templates: idsOf(model.templates),
    components: idsOf(model.components),
  };
  const findings = [
    ...ingredientFindings(model.ingredients ?? []),
    ...templateFindings(model.templates ?? [], known),
    ...componentFindings(model.components ?? [], known),
    ...dishFindings(model.dishes ?? [], known),
    ...stockFindings(model.stock ?? [], known),
    ...affinityFindings(model.affinities ?? [], known),
  ];
  return { ok: findings.length === 0, findings };
}
