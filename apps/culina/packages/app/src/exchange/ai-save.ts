// Saves a confirmed AI import: the catalogue entries and new ingredients the user chose, and every
// recipe of the answer as a component or a dish with its components, in one transaction, so Undo
// takes all of it back (decision ai-prompt-import, point 4).
import { importRecipe, quantityText } from '@culina/engine';
import { newId, today } from '../notebook';
import type { IngredientRecord } from '../records';
import { state } from '../notebook/state';
import { fail } from '../store/types';
import { strings } from '../strings';
import { decisionsOf } from './cook-model';
import { prepare, write } from './cook-save';
import { sourceText, type AiModel } from './ai-model';

export interface AiSaved {
  id: string;
  kind: 'components' | 'dishes';
  name: string;
}

export interface AiLineNote {
  name: string;
  text: string;
}

export type AiSaveResult =
  | { ok: true; saved: AiSaved[]; unmeasured: AiLineNote[]; guessed: AiLineNote[] }
  | { ok: false; error: { code: string } };

const portionsOf = (text: string): number | undefined =>
  /^\d+$/.test(text.trim()) && Number(text.trim()) > 0 ? Number(text.trim()) : undefined;
const gramsOf = (text: string): number | undefined => {
  const n = Number(text.replace(',', '.'));
  return text.trim() !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
};

export async function saveAiImport(
  model: AiModel,
  catalogue: ReadonlyMap<string, IngredientRecord> = new Map(),
): Promise<AiSaveResult> {
  if (state.store === undefined) return fail({ code: 'unavailable' });
  const prepared = prepare(model, catalogue);
  const text = strings.importing;
  const records: { kind: 'components' | 'dishes'; record: Record<string, unknown> }[] = [];
  const saved: AiSaved[] = [];
  const unmeasured: AiLineNote[] = [];
  const guessed: AiLineNote[] = [];
  for (const recipe of model.recipes) {
    const id = newId();
    const portions = portionsOf(recipe.portions);
    const yieldGrams = gramsOf(recipe.yieldGrams);
    const done = importRecipe(recipe.entry, decisionsOf(recipe.model, prepared.targetOf), {
      id,
      name: recipe.name.trim(),
      date: today(),
      change: text.aiChange(sourceText(recipe.entry)),
      ...(recipe.dish && portions !== undefined ? { portions } : {}),
      ...(!recipe.dish && yieldGrams !== undefined ? { yieldGrams } : {}),
      ...(recipe.dish && recipe.yieldLeftOut !== undefined
        ? { note: text.aiYieldNote(recipe.yieldLeftOut) }
        : {}),
      // A recipe of one component is that component: it takes the recipe's id and name.
      components: recipe.components.map((c) =>
        recipe.dish
          ? { id: newId(), name: c.name.trim(), role: c.role }
          : { id, name: recipe.name.trim(), role: c.role },
      ),
      guessedNote: text.aiGuessed,
      facts: prepared.facts,
    });
    if (!done.ok) return { ok: false, error: { code: done.error.code } };
    if (done.kind === 'dish') {
      records.push(...done.components.map((record) => ({ kind: 'components' as const, record })));
      records.push({ kind: 'dishes', record: done.dish });
    } else records.push({ kind: 'components', record: done.component });
    saved.push({
      id,
      kind: done.kind === 'dish' ? 'dishes' : 'components',
      name: recipe.name.trim(),
    });
    for (const i of done.unmeasured) {
      const use = recipe.uses[i];
      if (use) unmeasured.push({ name: use.name, text: quantityText(use.quantity) });
    }
    for (const use of recipe.uses) {
      if (use.guessed) guessed.push({ name: use.name, text: use.written ?? '' });
    }
  }
  const written = await write(prepared, records);
  if (!written.ok) return written;
  return { ok: true, saved, unmeasured, guessed };
}
