// Which component fills a slot of a shipped base, where the base has alternatives for it (a
// frame: the beans in place of the chicken). Chosen on the dish screen and kept while the app is
// open; nothing is stored. The cook screen and Keep read the same choice.
import { chooseAlternative, slotAlternatives, withoutAlternatives } from '@culina/engine';
import type { Classic, Lang } from '@culina/engine';
import { pickText } from '@culina/engine';

const chosen = new Map<string, Map<number, string>>();

/** Fills the slot with the component; an id that is no alternative of the slot changes nothing. */
export const chooseFilling = (classicId: string, slotIndex: number, componentId: string): void => {
  const slots = chosen.get(classicId) ?? new Map<number, string>();
  slots.set(slotIndex, componentId);
  chosen.set(classicId, slots);
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
