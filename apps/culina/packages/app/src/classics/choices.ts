// Which component fills a slot of a shipped base, where the base has alternatives for it (a
// frame: the beans in place of the chicken). Chosen on the dish screen and kept while the app is
// open; nothing is stored, so after a reload every frame is shipped again. The cook screen and Keep
// read the same choice, and so does every list that judges a dish (`dishClassics` in ./content.ts
// asks `choiceKey`); a choice sets the dish's step back to the first (`classics/session.ts`).
import { chooseAlternative, slotAlternatives, withoutAlternatives } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import { pickText } from '@culina/engine';
import { setStep } from './session';

const chosen = new Map<string, Map<number, string>>();

/**
 * Fills the slot with the component, for as long as the app runs. The shipped filling clears the
 * choice; an id that is neither the shipped filling nor an alternative of the slot changes nothing,
 * an earlier choice included. A change starts cooking the dish again at its first step, since the
 * method is another one.
 * @returns whether the dish changed.
 */
export const chooseFilling = (
  classic: Classic,
  slotIndex: number,
  componentId: string,
): boolean => {
  const slot = classic.slots[slotIndex];
  if (slot?.ref?.kind !== 'component') return false;
  const shipped = slot.ref.id;
  const valid =
    componentId === shipped || slotAlternatives(classic, slot).some((c) => c.id === componentId);
  if (!valid) return false;
  const slots = chosen.get(classic.id) ?? new Map<number, string>();
  if ((slots.get(slotIndex) ?? shipped) === componentId) return false;
  if (componentId === shipped) slots.delete(slotIndex);
  else slots.set(slotIndex, componentId);
  if (slots.size === 0) chosen.delete(classic.id);
  else chosen.set(classic.id, slots);
  setStep(classic.id, 0);
  return true;
};

/**
 * What the cook chose for a dish, as a text that is the same while the choice is the same, and
 * empty without one: what the caches of the lists compare, so that a choice redraws the one dish.
 */
export const choiceKey = (id: string): string => {
  const slots = chosen.get(id);
  if (slots === undefined) return '';
  return [...slots]
    .sort(([a], [b]) => a - b)
    .map(([slotIndex, componentId]) => `${slotIndex}=${componentId}`)
    .join(' ');
};

/** Forgets every choice (for tests). */
export const resetChoices = (): void => chosen.clear();

/** The base with the cook's choices, alternatives still in it: what Keep copies. */
export const withChoices = (classic: Classic): Classic => {
  let out = classic;
  for (const [slotIndex, componentId] of chosen.get(classic.id) ?? [])
    out = chooseAlternative(out, slotIndex, componentId);
  return out;
};

/** The base as it is cooked with the cook's choices: what the screens show. */
export const asChosen = (classic: Classic): Classic => withoutAlternatives(withChoices(classic));

/** One slot that has a choice: the component in it and the others that can fill it. */
export interface FillingChoice {
  slotIndex: number;
  role: string;
  current: string;
  options: { id: string; name: string }[];
}

/** The slots of the base that have alternatives, each with its options, the one in the dish first. */
export const fillingChoices = (classic: Classic, lang: Lang): FillingChoice[] => {
  const full = withChoices(classic);
  const nameOf = new Map((full.components ?? []).map((c) => [c.id, pickText(c.name, lang)]));
  return full.slots.flatMap((slot, slotIndex) => {
    const others = slotAlternatives(full, slot);
    if (slot.ref?.kind !== 'component' || others.length === 0) return [];
    const current = slot.ref.id;
    return [
      {
        slotIndex,
        role: slot.role,
        current,
        options: [current, ...others.map((c) => c.id)].map((id) => ({
          id,
          name: nameOf.get(id) ?? id,
        })),
      },
    ];
  });
};
