// Saves a completed Cooklang import: the new ingredients the user chose to create and the
// component (version 1 of a new family, or of a variation), or, for a file with sections, the
// dish and its components, in one transaction.
import { importComponent, importDish, quantityText } from '@culina/engine';
import type { IngredientFacts } from '@culina/engine';
import { chainOf } from '../catalogue/tree';
import { factsByIngredient, getIngredient, newId, reloadNotebook, today } from '../notebook';
import type { IngredientRecord } from '../records';
import { state } from '../notebook/state';
import { fail } from '../store/types';
import { strings } from '../strings';
import { componentParts, decisionsOf, type CookModel, type Target } from './cook-model';
import { rememberChanges } from './json-apply';

export interface CookSaveInput {
  model: CookModel;
  /** The component's name, or for a file with sections the dish's. */
  name: string;
  yieldGrams?: number;
  percentBase?: string;
  /** For a file with sections: the dish's portions. */
  portions?: number;
  /** The version record the new component (or dish) is a variation of; none for a new family. */
  parent?: string;
  /** The catalogue's entries by id: a name or a class chosen from it is adopted on save. */
  catalogue?: ReadonlyMap<string, IngredientRecord>;
}

export interface Unmeasured {
  name: string;
  text: string;
}

export type CookSaveResult =
  | {
      ok: true;
      /** The id of the record to open: the component, or the dish. */
      id: string;
      kind: 'components' | 'dishes';
      name: string;
      unmeasured: Unmeasured[];
    }
  | { ok: false; error: { code: string } };

interface Prepared {
  /** Catalogue entries (with their parent chains) to copy into the notebook, root first. */
  adopted: IngredientRecord[];
  ingredients: { id: string; name: string; parentId?: string }[];
  targetOf: (key: string) => Target;
  facts: (t: Target) => IngredientFacts;
}

/** Adopts the catalogue entries the user confirmed and gives new ingredients their ids. */
function prepare(model: CookModel, catalogue: ReadonlyMap<string, IngredientRecord>): Prepared {
  // What the user confirmed from the catalogue: the entries chosen for a name and the classes new
  // ingredients are filed under, each with its parent chain (as the picker's `adoptEntry` copies them).
  const chosen = new Set<string>();
  for (const row of model.rows) {
    if (row.choice.type === 'existing' && row.choice.target.kind === 'ingredient') {
      chosen.add(row.choice.target.id);
    } else if (row.choice.type === 'new' && row.choice.parentId !== undefined) {
      chosen.add(row.choice.parentId);
    }
  }
  // The copies are written in the same transaction as the import, root first, each once: a save
  // the store refuses leaves none of them behind.
  const adopted: IngredientRecord[] = [];
  for (const id of chosen) {
    const entry = catalogue.get(id);
    if (entry === undefined || getIngredient(id) !== undefined) continue;
    for (const record of [...chainOf(entry, catalogue), entry]) {
      if (getIngredient(record.id) !== undefined) continue;
      if (adopted.some((r) => r.id === record.id)) continue;
      adopted.push(record);
    }
  }
  const created = new Map<string, string>();
  const ingredients = model.rows.flatMap((row) => {
    if (row.choice.type !== 'new') return [];
    const id = newId();
    created.set(row.key, id);
    return [
      {
        id,
        name: row.label,
        ...(row.choice.parentId === undefined ? {} : { parentId: row.choice.parentId }),
      },
    ];
  });
  const targetOf = (key: string): Target => {
    const row = model.rows.find((r) => r.key === key);
    if (row?.choice.type === 'existing') return row.choice.target;
    return { kind: 'ingredient', id: created.get(key) ?? '' };
  };
  const known = factsByIngredient();
  const facts = (t: Target): IngredientFacts =>
    t.kind === 'ingredient' ? (known[t.id] ?? {}) : {};
  return { adopted, ingredients, targetOf, facts };
}

/** Writes the records in one transaction and remembers them for Undo. */
async function write(
  prepared: Prepared,
  records: { kind: 'components' | 'dishes'; record: Record<string, unknown> }[],
): Promise<{ ok: true } | { ok: false; error: { code: string } }> {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const entries = [
    ...prepared.adopted.map((record) => ({ kind: 'ingredients' as const, record })),
    ...prepared.ingredients.map((record) => ({ kind: 'ingredients' as const, record })),
    ...records,
  ];
  const written = await state.store.bulk.putMany(entries);
  if (!written.ok) return written;
  rememberChanges([
    ...prepared.adopted.map((r) => ({ kind: 'ingredients' as const, id: r.id })),
    ...prepared.ingredients.map((r) => ({ kind: 'ingredients' as const, id: r.id })),
    ...records.map((r) => ({ kind: r.kind, id: r.record.id as string })),
  ]);
  await reloadNotebook();
  return { ok: true };
}

const unmeasuredOf = (model: CookModel, indexes: readonly number[]): Unmeasured[] =>
  indexes.map((i) => ({
    name: model.lines[i]?.use.name ?? '',
    text: quantityText(model.lines[i]?.use.quantity),
  }));

export async function saveCookImport(input: CookSaveInput): Promise<CookSaveResult> {
  const { model } = input;
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const prepared = prepare(model, input.catalogue ?? new Map<string, IngredientRecord>());
  const decisions = decisionsOf(model, prepared.targetOf);
  const change = strings.importing.cookChange(model.fileName);
  const id = newId();
  if (model.dish) {
    const done = importDish(model.doc, decisions, {
      id,
      name: input.name,
      date: today(),
      change,
      ...(input.parent === undefined ? {} : { parent: input.parent }),
      ...(input.portions === undefined ? {} : { portions: input.portions }),
      components: componentParts(model).map((p) => ({
        id: newId(),
        name: p.name.trim(),
        role: p.role,
        ...(p.percentBase === '' ? {} : { percentBase: p.percentBase }),
      })),
      facts: prepared.facts,
    });
    if (!done.ok) return { ok: false, error: { code: done.error.code } };
    const written = await write(prepared, [
      ...done.components.map((record) => ({ kind: 'components' as const, record })),
      { kind: 'dishes' as const, record: done.dish },
    ]);
    if (!written.ok) return written;
    return {
      ok: true,
      id,
      kind: 'dishes',
      name: input.name,
      unmeasured: unmeasuredOf(model, done.unmeasured),
    };
  }
  const done = importComponent(model.doc, decisions, {
    id,
    name: input.name,
    date: today(),
    change,
    ...(input.parent === undefined ? {} : { parent: input.parent }),
    ...(input.yieldGrams === undefined ? {} : { yieldGrams: input.yieldGrams }),
    ...(input.percentBase === undefined ? {} : { percentBase: input.percentBase }),
    facts: prepared.facts,
  });
  if (!done.ok) return { ok: false, error: { code: done.error.code } };
  const written = await write(prepared, [{ kind: 'components', record: done.component }]);
  if (!written.ok) return written;
  return {
    ok: true,
    id,
    kind: 'components',
    name: input.name,
    unmeasured: unmeasuredOf(model, done.unmeasured),
  };
}
