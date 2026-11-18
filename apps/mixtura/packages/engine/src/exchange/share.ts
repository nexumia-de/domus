// The share file: one drink of the user's own, with only the records it
// needs, in the export format (docs/export-format.md#share-file). Pure: the
// instant comes from the host. "Own" is the id test of ids.ts: a seed id is a
// slug, so seed parents, templates and ingredients are not included; the
// receiver has them already.

import { buildExport, emptySnapshot } from './build';
import { isUserId } from './ids';
import type { ExchangeSpec, ExchangeTemplate, ExportFile, Snapshot } from './types';
import type { Ingredient } from '../drink-ingredients/types';

export type ShareResult =
  | { ok: true; file: ExportFile }
  /** The id names no spec of the user's data. */
  | { ok: false; failure: { kind: 'unknown-spec'; specId: string } };

interface SpecLike {
  lines?: { ingredientId: string; substitutes?: { ingredientId: string }[] }[];
}

/**
 * Builds the small export file that carries one drink: the chosen version, the chain of the
 * user's own parent versions, its template when the user made it, and every user ingredient the
 * lines (and substitutes) name, with what a prepared ingredient needs, recursively. No stock,
 * places or affinities.
 * @param snapshot Everything the user entered.
 * @param specId Id of the version to share (a spec record id, not a lineage id).
 * @param exportedAt The instant of sharing (ISO 8601 UTC), from the host.
 * @returns The file, or `unknown-spec` when no user spec has that id.
 */
export function buildShareFile(
  snapshot: Snapshot,
  specId: string,
  exportedAt: string,
): ShareResult {
  const specs = new Map<string, ExchangeSpec>(snapshot.specs.map((s) => [s.id, s]));
  const ingredients = new Map<string, Ingredient>(snapshot.ingredients.map((i) => [i.id, i]));
  const templates = new Map<string, ExchangeTemplate>(snapshot.templates.map((t) => [t.id, t]));
  if (!isUserId(specId) || !specs.has(specId)) {
    return { ok: false, failure: { kind: 'unknown-spec', specId } };
  }
  const takenSpecs = new Map<string, ExchangeSpec>();
  const takenIngredients = new Map<string, Ingredient>();
  const takenTemplates = new Map<string, ExchangeTemplate>();

  const addTemplate = (start: string | undefined): void => {
    // A cycle guard: a template already taken ends the walk.
    for (let id = start; id && isUserId(id) && !takenTemplates.has(id);) {
      const template = templates.get(id);
      if (!template) return;
      takenTemplates.set(id, template);
      id = template.parentId;
    }
  };

  const addIngredient = (start: string | undefined): void => {
    for (let id = start; id && isUserId(id) && !takenIngredients.has(id);) {
      const item = ingredients.get(id);
      if (!item) return;
      takenIngredients.set(id, item);
      if (item.prepared) addSpec(item.prepared.specId);
      id = item.parentId;
    }
  };

  const addSpec = (start: string | undefined): void => {
    for (let id = start; id && isUserId(id) && !takenSpecs.has(id);) {
      const spec = specs.get(id);
      if (!spec) return;
      takenSpecs.set(id, spec);
      addTemplate(spec.templateId);
      for (const line of (spec as SpecLike).lines ?? []) {
        addIngredient(line.ingredientId);
        for (const sub of line.substitutes ?? []) addIngredient(sub.ingredientId);
      }
      id = spec.parentId;
    }
  };

  addSpec(specId);
  const picked: Snapshot = {
    ...emptySnapshot(),
    ingredients: [...takenIngredients.values()],
    templates: [...takenTemplates.values()],
    specs: [...takenSpecs.values()],
  };
  return { ok: true, file: buildExport(picked, { exportedAt }) };
}
