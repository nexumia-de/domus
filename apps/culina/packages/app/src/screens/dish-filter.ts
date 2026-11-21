// The controls of the one filter over every dish (browse/filter.ts): selects of 44 px for the
// origin, the character, the course and the cuisine, and two ticks. A select is only drawn when
// it has something to offer. The caller keeps the filter and draws its list again on a change.
import type { Origin } from '../browse/entry';
import type { DishFilter, Offered } from '../browse/filter';
import { characterLabel } from '../characters/view';
import { currentLang } from '../classics/lang';
import { el } from '../shell/el';
import { strings } from '../strings';
import { nextId } from './fields';

/** The name of a course; a word the app does not know is shown as it is. */
export const courseLabel = (course: string): string =>
  (strings.classics.course as Record<string, string>)[course] ?? course;

/**
 * The name of a cuisine: the adjective of a country the app knows ("Italian", "Italienische
 * Küche"), else the word as given. The country's own name stays for the lists by country.
 */
export const cuisineLabel = (cuisine: string): string =>
  (strings.browse.cuisines as Record<string, string>)[cuisine] ?? cuisine;

interface Choice {
  value: string;
  label: string;
}

const select = (
  className: string,
  label: string,
  any: string,
  choices: readonly Choice[],
  chosen: string | undefined,
  onChange: (value: string | undefined) => void,
  labelOf: (value: string) => string = (value) => value,
): HTMLElement => {
  const control = el('select', `field ${className}`);
  control.id = nextId('dish-filter');
  // A stored choice the list no longer offers stays offered, so that it can be seen and dropped.
  const all =
    chosen !== undefined && !choices.some((c) => c.value === chosen)
      ? [...choices, { value: chosen, label: labelOf(chosen) }]
      : choices;
  const first = el('option', undefined, any);
  first.value = '';
  control.append(
    first,
    ...all.map((c) => {
      const option = el('option', undefined, c.label);
      option.value = c.value;
      return option;
    }),
  );
  control.value = chosen ?? '';
  control.addEventListener('change', () =>
    onChange(control.value === '' ? undefined : control.value),
  );
  const text = el('label', 'field-label', label);
  text.htmlFor = control.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(text, control);
  return wrap;
};

const tick = (
  className: string,
  label: string,
  checked: boolean,
  onChange: (on: boolean) => void,
): HTMLElement => {
  const choice = el('label', `choice ${className}`);
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  choice.append(input, el('span', undefined, label));
  return choice;
};

const without = (filter: DishFilter, key: keyof DishFilter): DishFilter =>
  Object.fromEntries(Object.entries(filter).filter(([k]) => k !== key)) as DishFilter;

export interface DishFilterOptions {
  /** Leave the origin select out (a list of one origin). */
  noOrigin?: boolean;
}

/**
 * The filter's controls for the given state. `onChange` gets the next filter; the caller stores
 * it and replaces these controls (they do not update themselves).
 */
export const dishFilterControls = (
  filter: DishFilter,
  offered: Offered,
  onChange: (next: DishFilter) => void,
  options: DishFilterOptions = {},
): HTMLElement => {
  const t = strings.browse;
  const set = <K extends keyof DishFilter>(key: K, value: DishFilter[K] | undefined): void =>
    onChange(value === undefined ? without(filter, key) : { ...filter, [key]: value });

  const selects: HTMLElement[] = [];
  if (options.noOrigin !== true && (offered.origins.length > 1 || filter.origin !== undefined))
    selects.push(
      select(
        'dish-filter-origin',
        t.originLabel,
        t.originAny,
        offered.origins.map((o) => ({ value: o, label: t.originChoice[o] })),
        filter.origin,
        (v) => set('origin', v as Origin | undefined),
        (v) => t.originChoice[v as Origin] ?? v,
      ),
    );
  if (offered.characters.length > 0 || filter.character !== undefined)
    selects.push(
      select(
        'dish-filter-character',
        t.characterLabel,
        t.characterAny,
        offered.characters.map((c) => ({ value: c, label: characterLabel(c, currentLang()) })),
        filter.character,
        (v) => set('character', v),
        (v) => characterLabel(v, currentLang()),
      ),
    );
  if (offered.courses.length > 0 || filter.course !== undefined)
    selects.push(
      select(
        'dish-filter-course',
        t.courseLabel,
        t.courseAny,
        offered.courses.map((c) => ({ value: c, label: courseLabel(c) })),
        filter.course,
        (v) => set('course', v),
        courseLabel,
      ),
    );
  if (offered.cuisines.length > 0 || filter.cuisine !== undefined)
    selects.push(
      select(
        'dish-filter-cuisine',
        t.cuisineLabel,
        t.cuisineAny,
        offered.cuisines.map((c) => ({ value: c, label: cuisineLabel(c) })),
        filter.cuisine,
        (v) => set('cuisine', v),
        cuisineLabel,
      ),
    );

  const group = el('div', 'dish-filter');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t.filtersLabel);
  const grid = el('div', 'cook-filters dish-filter-selects');
  grid.append(...selects);
  const ticks = el('div', 'tick-choices dish-filter-ticks');
  ticks.append(
    tick('dish-filter-meat-free', t.meatFree, filter.meatFree === true, (on) =>
      set('meatFree', on ? true : undefined),
    ),
    tick('dish-filter-complete', t.completeOnly, filter.completeOnly === true, (on) =>
      set('completeOnly', on ? true : undefined),
    ),
  );
  group.append(grid, ticks);
  return group;
};

/** The order in which courses are offered; kept in browse/filter.ts, where the native app reaches it too. */
export { COURSE_ORDER } from '../browse/filter';

/** The class `dish-filter-…` of the control in `slot` that has focus; undefined when none has. */
const focusedControl = (slot: HTMLElement): string | undefined => {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !slot.contains(active)) return undefined;
  const owner = active instanceof HTMLSelectElement ? active : active.closest('.choice');
  return owner === null
    ? undefined
    : [...owner.classList].find((c) => c.startsWith('dish-filter-'));
};

/**
 * Puts freshly drawn filter controls into `slot`. The controls are drawn anew on every change, so
 * the control that had focus (a select, or a tick by its box) gets it back. The list and the
 * finder both use this.
 */
export const replaceFilterControls = (slot: HTMLElement, controls: HTMLElement): void => {
  const keep = focusedControl(slot);
  slot.replaceChildren(controls);
  if (keep === undefined) return;
  const again = slot.querySelector(`.${keep}`);
  (again instanceof HTMLSelectElement ? again : again?.querySelector('input'))?.focus();
};
