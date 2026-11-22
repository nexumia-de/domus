// Keeping a classic, or one of its components, in the notebook: the engine copies it as version 1
// with its origin, the app writes the records. A classic itself is never written.
import { copyClassic, copyClassicComponent } from '@culina/engine';
import type { Classic, ComponentRef, CopiedComponent, Lang } from '@culina/engine';
import { adoptEntry } from '../catalogue/adopt';
import { newId, saveRecord, today } from '../notebook';
import type { Result } from '../store/types';
import { catalogueEntries } from './names';

type Refused =
  | { ok: false; reason: 'wanted'; names: string[] }
  | { ok: false; reason: 'store'; result: Result }
  | { ok: false; reason: 'engine' };

export type KeepResult = { ok: true; dishId: string } | Refused;
export type KeepComponentResult = { ok: true; componentId: string } | Refused;

/**
 * Writes copied components: first the ingredients they and `more` name from the catalogue (the same
 * adoption as the picker), then the components in the order given.
 */
const writeComponents = async (
  components: readonly CopiedComponent[],
  more: readonly { ref: ComponentRef }[] = [],
): Promise<Refused | undefined> => {
  const catalogue = catalogueEntries();
  const refs = [...components.flatMap((c) => c.lines), ...more]
    .map((line) => line.ref)
    .filter((ref) => ref.kind === 'ingredient');
  for (const ref of new Set(refs.map((r) => r.id))) {
    const entry = catalogue.get(ref);
    if (entry === undefined) continue;
    const adopted = await adoptEntry(entry, catalogue);
    if (!adopted.ok) return { ok: false, reason: 'store', result: adopted };
  }
  for (const component of components) {
    const done = await saveRecord('components', component as never);
    if (!done.ok) return { ok: false, reason: 'store', result: done };
  }
  return undefined;
};

/**
 * Copies a classic into the notebook: first the ingredients it names from the catalogue (the same
 * adoption as the picker), then the components, then the dish.
 *
 * @param classic - A shipped classic.
 * @param portions - Portions of the copy.
 * @param lang - The content language of the copy's names.
 */
export const keepClassic = async (
  classic: Classic,
  portions: number,
  lang: Lang,
): Promise<KeepResult> => {
  const copied = copyClassic(classic, { portions, lang, date: today(), newId });
  if (!copied.ok) {
    return copied.error.code === 'wanted-ingredient'
      ? { ok: false, reason: 'wanted', names: copied.error.wanted }
      : { ok: false, reason: 'engine' };
  }
  const failed = await writeComponents(copied.components, copied.dish.slots);
  if (failed !== undefined) return failed;
  const done = await saveRecord('dishes', copied.dish as never);
  return done.ok
    ? { ok: true, dishId: copied.dish.id }
    : { ok: false, reason: 'store', result: done };
};

/**
 * Copies one component of a shipped dish or base into the notebook, with the components its lines
 * name, as version 1 of an own component each (`copyClassicComponent`, which is `copyClassic` on
 * that part of the file). The ingredients are adopted from the catalogue as for a whole dish.
 *
 * @param classic - The shipped dish or base.
 * @param componentId - The component's id in it.
 * @param portions - Portions of the dish the amounts are for.
 * @param lang - The content language of the copy's names.
 * @returns The id of the new component, or why nothing was kept.
 */
export const keepShippedComponent = async (
  classic: Classic,
  componentId: string,
  portions: number,
  lang: Lang,
): Promise<KeepComponentResult> => {
  const copied = copyClassicComponent(classic, componentId, {
    portions,
    lang,
    date: today(),
    newId,
  });
  if (!copied.ok) {
    return copied.error.code === 'wanted-ingredient'
      ? { ok: false, reason: 'wanted', names: copied.error.wanted }
      : { ok: false, reason: 'engine' };
  }
  const [first, ...named] = copied.components;
  if (first === undefined) return { ok: false, reason: 'engine' };
  // The components it names first: a store failure half way then never leaves a component naming
  // one that is not there (test/components-shipped-order.test.ts).
  const failed = await writeComponents([...named, first]);
  return failed ?? { ok: true, componentId: first.id };
};
