// #/dishes/random: a dish put together by chance. The cook ticks the roles wanted, may ask for
// only what is ready in stock, and rolls: one component per role, each role to be rolled again
// alone. "Make it a dish" opens the dish editor with the picks as slots; nothing is stored here.
import { roleLabel } from '../components/names';
import { roleCandidates } from '../dishes/alternatives';
import { roll, rollRole, type PickOptions, type RolePick } from '../dishes/pick';
import { setDishPrefill } from '../editor/prefill';
import { ROLE_IDS } from '../editor/units';
import { notebook, stockOf } from '../notebook';
import { hashFor } from '../router';
import { el } from '../shell/el';
import { strings } from '../strings';

const t = strings.dishes;

/** The roles ticked when the screen is first opened. */
export const DEFAULT_PICK_ROLES: readonly string[] = ['main', 'starch', 'sauce'];

/** Ticks and the last pick survive a look at a component; a reload starts again. In memory only. */
const state: { roles: Set<string>; onlyStock: boolean; picks: RolePick[] | undefined } = {
  roles: new Set(DEFAULT_PICK_ROLES),
  onlyStock: false,
  picks: undefined,
};

const inStock = (componentId: string): boolean =>
  stockOf({ kind: 'component', id: componentId }).length > 0;

const tick = (label: string, checked: boolean, onChange: (on: boolean) => void): HTMLElement => {
  const choice = el('label', 'choice');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  choice.append(input, el('span', undefined, label));
  return choice;
};

export const randomDishScreen = (): HTMLElement => {
  const screen = el('section', 'screen dish-random');
  const back = el('a', 'back-link', t.back);
  back.href = hashFor('dishes');
  const result = el('div', 'pick-result');
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');
  const options = (): PickOptions => ({ onlyStock: state.onlyStock, inStock });

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
      state.picks = (state.picks ?? []).map((p) =>
        p.role === pick.role
          ? rollRole(pick.role, roleCandidates(notebook()), options(), Math.random, p.choice?.id)
          : p,
      );
      draw();
      result.querySelector<HTMLElement>(`[data-again="${pick.role}"]`)?.focus();
    });
    li.append(again);
    return li;
  };

  const draw = (): void => {
    const picks = state.picks;
    if (picks === undefined) {
      result.replaceChildren();
      return;
    }
    const heading = el('h2', undefined, t.pickHeading);
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
      tick(roleLabel(role), state.roles.has(role), (on) => {
        if (on) state.roles.add(role);
        else state.roles.delete(role);
      }),
    ),
  );
  const stock = el('div', 'tick-choices pick-stock');
  stock.append(
    tick(t.pickOnlyStock, state.onlyStock, (on) => {
      state.onlyStock = on;
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
    state.picks = roll(wanted, roleCandidates(notebook()), options(), Math.random);
    draw();
    result.querySelector<HTMLElement>('h2')?.focus();
  });

  // A pick from an earlier visit may name a component that is gone: it is shown only while there.
  if (state.picks !== undefined) {
    const there = new Set(roleCandidates(notebook()).map((c) => c.id));
    if (state.picks.some((p) => p.choice !== undefined && !there.has(p.choice.id))) {
      state.picks = undefined;
    }
  }
  draw();
  screen.append(
    back,
    el('h1', undefined, t.pickTitle),
    el('p', 'note-quiet', t.pickNote),
    roles,
    stock,
    rollButton,
    status,
    result,
  );
  return screen;
};
