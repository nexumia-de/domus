// #/dishes/random: what do I feel like? Two rolls under the one filter over every dish
// (browse/filter.ts), whose controls are shown here and kept for the list and the finder too.
// "Surprise me with a dish" takes one whole dish by chance, of either origin, among those that
// pass the filter (and, when ticked, that the stock allows now). Below, the roll per role puts one
// component per ticked role together; with a character or "without meat and fish" chosen, it rolls
// among the combinations that have it. "Make it a dish" opens the dish editor with the picks as
// slots; nothing is stored here.
import type { DishEntry } from '../browse/entry';
import { offeredBy, type DishFilter } from '../browse/filter';
import { characterLookup } from '../characters/lookup';
import { CHARACTER_TABLE } from '../characters/table';
import { loadNames } from '../classics/names';
import { roleLabel } from '../components/names';
import { roleCandidates } from '../dishes/alternatives';
import {
  roll,
  rollFitting,
  rollRole,
  rollRoleFitting,
  type FittingRoll,
  type PickOptions,
  type RolePick,
} from '../dishes/pick';
import { dishPool, surpriseDish } from '../dishes/pick-dish';
import { combinationJudge, judgesCombination } from '../dishes/pick-judge';
import { readyNowKeys } from '../dishes/ready-now';
import { setDishPrefill } from '../editor/prefill';
import { ROLE_IDS } from '../editor/units';
import { notebook, stockOf } from '../notebook';
import { CLASSIC_COUNTRIES } from '../prefs';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';
import {
  COURSE_ORDER,
  courseLabel,
  cuisineLabel,
  dishFilterControls,
  replaceFilterControls,
} from './dish-filter';
import { currentDishFilter, keepDishFilter } from '../browse/filter';
import { everyEntry } from './dish-list';

const t = strings.dishes;
const tb = strings.browse;

/** The roles ticked when the screen is first opened. */
export const DEFAULT_PICK_ROLES: readonly string[] = ['main', 'starch', 'sauce'];

/** Ticks and the last picks survive a look at a dish; a reload starts again. In memory only. */
const state: {
  roles: Set<string>;
  onlyStock: boolean;
  picks: RolePick[] | undefined;
  /** The last roll per role found no combination that fits. */
  noFit: Extract<FittingRoll, { found: false }> | undefined;
  dishReady: boolean;
  /** The key of the dish last rolled. */
  dish: string | undefined;
  /** True: the last "Surprise me" found no dish. */
  dishNone: boolean;
  /** The judged part of the filter the picks or `noFit` were rolled under (`judgeKey`). */
  judgedUnder: string | undefined;
  /** The whole filter and the stock tick that the last "Surprise me" found no dish under. */
  dishNoneUnder: string | undefined;
} = {
  roles: new Set(DEFAULT_PICK_ROLES),
  onlyStock: false,
  picks: undefined,
  noFit: undefined,
  dishReady: false,
  dish: undefined,
  dishNone: false,
  judgedUnder: undefined,
  dishNoneUnder: undefined,
};

/** The part of the filter a combination is judged by: the character and "without meat and fish". */
const judgeKey = (filter: DishFilter): string =>
  JSON.stringify([filter.character ?? null, filter.meatFree === true]);

/** The whole filter and the stock tick, as "Surprise me" saw them. */
const dishKey = (filter: DishFilter): string =>
  JSON.stringify([
    filter.origin,
    filter.character,
    filter.course,
    filter.cuisine,
    filter.meatFree,
    filter.completeOnly,
    state.dishReady,
  ]);

/** Drops the picks of the roll per role and its "none found". */
const dropPicks = (): void => {
  state.picks = undefined;
  state.noFit = undefined;
  state.judgedUnder = undefined;
};

const inStock = (componentId: string): boolean =>
  stockOf({ kind: 'component', id: componentId }).length > 0;

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

const metaOf = (entry: DishEntry): string =>
  [
    tb.origin[entry.origin],
    ...(entry.course === undefined ? [] : [courseLabel(entry.course)]),
    ...(entry.cuisine === undefined ? [] : [cuisineLabel(entry.cuisine)]),
  ].join(' · ');

export const randomDishScreen = (): HTMLElement => {
  const screen = el('section', 'screen dish-random');
  const back = el('a', 'back-link', t.back);
  back.href = hashFor('dishes');
  let filter: DishFilter = currentDishFilter();
  // The list and the finder write the same filter: what was judged or found under another choice
  // no longer holds when the screen is opened again.
  if (state.judgedUnder !== undefined && state.judgedUnder !== judgeKey(filter)) dropPicks();
  if (state.dishNone && state.dishNoneUnder !== dishKey(filter)) state.dishNone = false;
  // Every dish as an entry, once per visit (and again when the catalogue has loaded).
  let all = everyEntry();
  const options = (): PickOptions => ({ onlyStock: state.onlyStock, inStock });
  const judge = () => combinationJudge(notebook(), characterLookup, filter);

  // The one filter: its controls are replaced on every change.
  const filterBox = el('div', 'pick-filter');
  const drawFilter = (): void => {
    replaceFilterControls(
      filterBox,
      dishFilterControls(
        filter,
        offeredBy(all, {
          characters: CHARACTER_TABLE.map((c) => c.id),
          courses: COURSE_ORDER,
          cuisines: CLASSIC_COUNTRIES,
        }),
        (next) => {
          filter = next;
          keepDishFilter(next);
          // A combination judged by other choices is not kept: its counts belong to those.
          if (state.judgedUnder !== undefined && state.judgedUnder !== judgeKey(next)) dropPicks();
          state.dishNone = false;
          drawFilter();
          drawDish();
          drawRoles();
        },
      ),
    );
  };

  // "Surprise me with a dish".
  const dishResult = el('div', 'pick-dish-result');
  const pool = (): DishEntry[] =>
    dishPool(all, filter, state.dishReady ? readyNowKeys() : undefined);
  const rollDish = (not?: string): void => {
    const found = surpriseDish(pool(), Math.random(), not);
    state.dish = found?.key;
    state.dishNone = found === undefined;
    state.dishNoneUnder = state.dishNone ? dishKey(filter) : undefined;
  };
  const drawDish = (): void => {
    if (state.dishNone) {
      const reset = el('button', 'btn quiet pick-dish-reset', tb.reset);
      reset.type = 'button';
      reset.addEventListener('click', () => {
        filter = {};
        keepDishFilter(filter);
        state.dishReady = false;
        if (state.judgedUnder !== undefined && state.judgedUnder !== judgeKey(filter)) dropPicks();
        rollDish();
        drawFilter();
        drawDishControls();
        drawDish();
        drawRoles();
        dishResult.querySelector<HTMLElement>('.pick-dish-link')?.focus();
      });
      const narrowedByStock =
        state.dishReady && dishPool(all, filter).length > 0 ? t.pickDishNoneReady : tb.none;
      dishResult.replaceChildren(el('p', 'note-quiet pick-dish-none', narrowedByStock), reset);
      return;
    }
    const list = state.dish === undefined ? [] : pool();
    const entry = list.find((e) => e.key === state.dish);
    if (entry === undefined) {
      // Nothing rolled yet, or the dish no longer fits the choice: nothing is shown.
      state.dish = undefined;
      dishResult.replaceChildren();
      return;
    }
    const box = el('div', 'pick-dish');
    const text = el('div', 'pick-text');
    const link = el('a', 'line-link pick-dish-link', entry.name);
    link.href = entry.href;
    text.append(
      el('span', 'slot-role', t.pickDishResult),
      link,
      el('span', 'line-extra pick-dish-meta', metaOf(entry)),
      el('span', 'note-quiet pick-dish-among', t.pickDishAmong(list.length)),
    );
    box.append(text);
    if (list.length > 1) {
      const again = el('button', 'btn quiet pick-again pick-dish-again', t.pickAgain);
      again.type = 'button';
      again.setAttribute('aria-label', t.pickDishAgainLabel);
      again.addEventListener('click', () => {
        rollDish(entry.key);
        drawDish();
        dishResult.querySelector<HTMLElement>('.pick-dish-again')?.focus();
      });
      box.append(again);
    }
    dishResult.replaceChildren(box);
  };
  const dishControls = el('div', 'tick-choices pick-dish-ready');
  const drawDishControls = (): void => {
    dishControls.replaceChildren(
      tick('pick-dish-ready-tick', t.pickDishReady, state.dishReady, (on) => {
        state.dishReady = on;
        state.dishNone = false;
        drawDish();
      }),
    );
  };
  const dishRoll = el('button', 'btn primary pick-dish-roll', t.pickDishRoll);
  dishRoll.type = 'button';
  dishRoll.addEventListener('click', () => {
    rollDish();
    drawDish();
    dishResult.querySelector<HTMLElement>('.pick-dish-link, .pick-dish-reset')?.focus();
  });

  // The roll per role.
  const result = el('div', 'pick-result');
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');
  const fitsNote = el('p', 'note-quiet pick-fits-note', t.pickFitsNote);

  const row = (pick: RolePick): HTMLElement => {
    const li = el('li', 'pick-row');
    const text = el('div', 'pick-text');
    text.append(el('span', 'slot-role', roleLabel(pick.role)));
    li.append(text);
    if (pick.choice === undefined) {
      text.append(el('span', 'note-quiet', state.onlyStock ? t.pickNoneStock : t.pickNone));
      return li;
    }
    const link = el('a', 'line-link', pick.choice.name);
    link.href = hashFor('components', pick.choice.id);
    text.append(link);
    if (inStock(pick.choice.id)) text.append(el('span', 'line-extra', t.pickInStock));
    if (pick.of < 2) {
      text.append(el('span', 'line-extra', t.pickOnly));
      return li;
    }
    const again = el('button', 'btn quiet pick-again', t.pickAgain);
    again.type = 'button';
    again.dataset.again = pick.role;
    again.setAttribute('aria-label', t.pickAgainFor(roleLabel(pick.role)));
    again.addEventListener('click', () => {
      const candidates = roleCandidates(notebook());
      const fits = judge();
      const picks = state.picks ?? [];
      state.picks =
        fits === undefined
          ? picks.map((p) =>
              p.role === pick.role
                ? rollRole(pick.role, candidates, options(), Math.random, p.choice?.id)
                : p,
            )
          : rollRoleFitting(pick.role, picks, candidates, options(), Math.random, fits);
      drawRoles();
      result.querySelector<HTMLElement>(`[data-again="${pick.role}"]`)?.focus();
    });
    li.append(again);
    return li;
  };

  const drawRoles = (): void => {
    fitsNote.hidden = !judgesCombination(filter);
    if (state.noFit !== undefined) {
      const none = state.noFit;
      const sentence = el(
        'p',
        'note-quiet pick-no-fit',
        none.all ? t.pickNoFit : t.pickNoFitTried(none.tries, none.combinations),
      );
      sentence.tabIndex = -1;
      result.replaceChildren(sentence);
      return;
    }
    const picks = state.picks;
    if (picks === undefined) {
      result.replaceChildren();
      return;
    }
    const heading = el('h3', undefined, t.pickHeading);
    heading.tabIndex = -1;
    const list = el('ul', 'pick-rows');
    list.append(...picks.map(row));
    const chosen = picks.flatMap((p) =>
      p.choice === undefined ? [] : [{ role: p.role, componentId: p.choice.id }],
    );
    const nodes: HTMLElement[] = [heading, list];
    if (chosen.length > 0) {
      const make = el('button', 'btn primary pick-make', t.pickMake);
      make.type = 'button';
      make.addEventListener('click', () => {
        setDishPrefill({ slots: chosen });
        window.location.hash = hashFor('dishes', undefined, 'new');
      });
      nodes.push(make);
    }
    result.replaceChildren(...nodes);
  };

  const roles = el('fieldset', 'choices tick-choices pick-roles');
  roles.append(
    el('legend', undefined, t.pickRoles),
    ...ROLE_IDS.map((role) =>
      tick('', roleLabel(role), state.roles.has(role), (on) => {
        if (on) state.roles.add(role);
        else state.roles.delete(role);
      }),
    ),
  );
  const stock = el('div', 'tick-choices pick-stock');
  stock.append(
    tick('', t.pickOnlyStock, state.onlyStock, (on) => {
      // The picks were rolled under the other choice: they are dropped, not kept half valid.
      state.onlyStock = on;
      if (state.picks !== undefined || state.noFit !== undefined) {
        dropPicks();
        drawRoles();
      }
    }),
  );
  const rollButton = el('button', 'btn primary pick-roll', t.pickRoll);
  rollButton.type = 'button';
  rollButton.addEventListener('click', () => {
    const wanted = ROLE_IDS.filter((role) => state.roles.has(role));
    if (wanted.length === 0) {
      status.textContent = t.pickNoRoles;
      return;
    }
    status.textContent = '';
    const candidates = roleCandidates(notebook());
    const fits = judge();
    state.noFit = undefined;
    state.judgedUnder = judgeKey(filter);
    if (fits === undefined) {
      state.picks = roll(wanted, candidates, options(), Math.random);
    } else {
      const found = rollFitting(wanted, candidates, options(), Math.random, fits);
      state.picks = found.found ? found.picks : undefined;
      if (!found.found) state.noFit = found;
    }
    drawRoles();
    result.querySelector<HTMLElement>('h3, .pick-no-fit')?.focus();
  });

  // A pick from an earlier visit may name a component that is gone: it is shown only while there.
  if (state.picks !== undefined) {
    const there = new Set(roleCandidates(notebook()).map((c) => c.id));
    if (state.picks.some((p) => p.choice !== undefined && !there.has(p.choice.id))) {
      state.picks = undefined;
    }
  }
  drawFilter();
  drawDishControls();
  drawDish();
  drawRoles();
  // The catalogue completes the characters of the shipped dishes; draw again once it is there.
  void loadNames().then(() => {
    if (!screen.isConnected) return;
    all = everyEntry();
    drawFilter();
    drawDish();
  });

  const dishSection = el('section', 'pick-section pick-dish-section');
  dishSection.append(
    el('h2', undefined, t.pickDishHeading),
    el('p', 'note-quiet', t.pickDishNote),
    dishControls,
    dishRoll,
    dishResult,
  );
  const roleSection = el('section', 'pick-section pick-role-section');
  roleSection.append(
    el('h2', undefined, t.pickRolesHeading),
    el('p', 'note-quiet', t.pickNote),
    fitsNote,
    roles,
    stock,
    rollButton,
    status,
    result,
  );
  screen.append(back, el('h1', undefined, t.pickTitle), filterBox, dishSection, roleSection);
  return screen;
};
