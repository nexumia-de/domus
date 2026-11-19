// The two filters of the finder: a role (only what covers it) and how much may lack. Both are
// selects of 44 px; a change is kept at once in the preferences and draws the list again.
import { roleLabel } from '../../components/names';
import { MAX_LACKING, type CookFilters } from '../../prefs';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';

const t = strings.cook;

export interface FilterControls {
  element: HTMLElement;
  /** Sets the roles the role filter offers; the chosen one stays offered. */
  setRoles(roles: readonly string[]): void;
}

const field = (label: string, select: HTMLSelectElement): HTMLElement => {
  select.id = nextId('cook-filter');
  const text = el('label', 'field-label', label);
  text.htmlFor = select.id;
  const wrap = el('div', 'field-wrap');
  wrap.append(text, select);
  return wrap;
};

export const filterControls = (
  filters: CookFilters,
  onChange: (next: CookFilters) => void,
): FilterControls => {
  const role = el('select', 'field cook-role');
  const lacking = el('select', 'field cook-lacking');
  for (let n = 0; n <= MAX_LACKING; n++) {
    const option = el('option', undefined, t.lackingOptions[n as 0 | 1 | 2 | 3]);
    option.value = String(n);
    lacking.append(option);
  }
  lacking.value = String(filters.lacking);
  let chosen = filters.role;
  const current = (): CookFilters => {
    chosen = role.value !== '' ? role.value : undefined;
    return { ...(chosen !== undefined ? { role: chosen } : {}), lacking: Number(lacking.value) };
  };
  role.addEventListener('change', () => onChange(current()));
  lacking.addEventListener('change', () => onChange(current()));

  const group = el('div', 'cook-filters');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', t.filtersLabel);
  group.append(field(t.lackingLabel, lacking), field(t.roleLabel, role));

  const setRoles = (roles: readonly string[]): void => {
    const all = chosen !== undefined && !roles.includes(chosen) ? [...roles, chosen].sort() : roles;
    const any = el('option', undefined, t.roleAny);
    any.value = '';
    role.replaceChildren(
      any,
      ...all.map((r) => {
        const option = el('option', undefined, roleLabel(r));
        option.value = r;
        return option;
      }),
    );
    role.value = chosen ?? '';
  };
  setRoles([]);
  return { element: group, setRoles };
};
