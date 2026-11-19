// Saves a completed Cooklang import: the new ingredients the user chose to create and the
// component (version 1 of a new family, or of a variation), in one transaction.
import { importComponent, quantityText } from '@culina/engine';
import type { IngredientFacts } from '@culina/engine';
import { adoptEntry } from '../catalogue/adopt';
import { chainOf } from '../catalogue/tree';
import { factsByIngredient, getIngredient, newId, reloadNotebook, today } from '../notebook';
import type { IngredientRecord } from '../records';
import { state } from '../notebook/state';
import { fail } from '../store/types';
import { strings } from '../strings';
import { decisionsOf, type CookModel, type Target } from './cook-model';
import { rememberChanges } from './json-apply';

export interface CookSaveInput {
  model: CookModel;
  name: string;
  yieldGrams?: number;
  percentBase?: string;
  /** The version record the new component is a variation of; none for a new family. */
  parent?: string;
  /** The catalogue's entries by id: a name or a class chosen from it is adopted on save. */
  catalogue?: ReadonlyMap<string, IngredientRecord>;
}

export interface Unmeasured {
  name: string;
  text: string;
}

export type CookSaveResult =
  | { ok: true; id: string; name: string; unmeasured: Unmeasured[] }
  | { ok: false; error: { code: string } };

export async function saveCookImport(input: CookSaveInput): Promise<CookSaveResult> {
  const { model } = input;
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const catalogue = input.catalogue ?? new Map<string, IngredientRecord>();
  // What the user confirmed from the catalogue: the entries chosen for a name and the classes new
  // ingredients are filed under. Each comes with its parent chain, through the picker's `adoptEntry`.
  const chosen = new Set<string>();
  for (const row of model.rows) {
    if (row.choice.type === 'existing' && row.choice.target.kind === 'ingredient') {
      chosen.add(row.choice.target.id);
    } else if (row.choice.type === 'new' && row.choice.parentId !== undefined) {
      chosen.add(row.choice.parentId);
    }
  }
  const adopted: string[] = [];
  for (const id of chosen) {
    const entry = catalogue.get(id);
    if (entry === undefined || getIngredient(id) !== undefined) continue;
    const added = [...chainOf(entry, catalogue), entry].filter(
      (r) => getIngredient(r.id) === undefined,
    );
    const done = await adoptEntry(entry, catalogue);
    if (!done.ok) return done;
    adopted.push(...added.map((r) => r.id));
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
  const id = newId();
  const done = importComponent(model.doc, decisionsOf(model, targetOf), {
    id,
    name: input.name,
    date: today(),
    change: strings.importing.cookChange(model.fileName),
    ...(input.parent === undefined ? {} : { parent: input.parent }),
    ...(input.yieldGrams === undefined ? {} : { yieldGrams: input.yieldGrams }),
    ...(input.percentBase === undefined ? {} : { percentBase: input.percentBase }),
    facts,
  });
  if (!done.ok) return { ok: false, error: { code: done.error.code } };

  const entries = [
    ...ingredients.map((record) => ({ kind: 'ingredients' as const, record })),
    { kind: 'components' as const, record: done.component },
  ];
  const written = await state.store.bulk.putMany(entries);
  if (!written.ok) return written;
  rememberChanges([
    ...adopted.map((id) => ({ kind: 'ingredients' as const, id })),
    ...ingredients.map((r) => ({ kind: 'ingredients' as const, id: r.id })),
    { kind: 'components' as const, id },
  ]);
  await reloadNotebook();
  const uses = model.lines;
  return {
    ok: true,
    id,
    name: input.name,
    unmeasured: done.unmeasured.map((i) => ({
      name: uses[i]?.use.name ?? '',
      text: quantityText(uses[i]?.use.quantity),
    })),
  };
}
