// Cooklang completion, part one: which ingredient each name of the file means. Each name is
// asked once. Only an exact match is preselected; everything else waits for the user's choice.
import { choose, createForUnset, unresolvedNames } from '../../exchange/cook-model';
import type { CookModel, NameRow, Target } from '../../exchange/cook-model';
import { factsByIngredient } from '../../notebook';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const text = strings.importing;
const NEW = 'new';

const factsOf = (target: Target) =>
  target.kind === 'ingredient' ? (factsByIngredient()[target.id] ?? {}) : {};

const keyOfTarget = (t: Target): string => `${t.kind}:${t.id}`;
const optionLabel = (name: string, tag: string): string => `${name} (${tag})`;

/** The select of one name: the proposals, "create a new ingredient", and for that the class to file it under. */
function nameRow(model: CookModel, row: NameRow, changed: (names: boolean) => void): HTMLElement {
  const wrap = el('div', 'field-wrap name-row');
  const select = el('select', 'field');
  select.setAttribute('aria-label', text.cookNameLabel(row.label));
  const placeholder = el('option', undefined, text.cookChoose);
  placeholder.value = '';
  select.append(placeholder);
  for (const option of row.options) {
    const tag =
      option.tag === 'same'
        ? text.cookSameName
        : option.tag === 'component'
          ? text.cookComponent
          : text.cookCloseName;
    const node = el('option', undefined, optionLabel(option.name, tag));
    node.value = keyOfTarget(option.target);
    select.append(node);
  }
  const create = el('option', undefined, text.cookCreateNew);
  create.value = NEW;
  select.append(create);
  select.value =
    row.choice.type === 'existing'
      ? keyOfTarget(row.choice.target)
      : row.choice.type === 'new'
        ? NEW
        : '';

  const under = el('select', 'field');
  under.setAttribute('aria-label', `${text.cookFileUnder}: ${row.label}`);
  const none = el('option', undefined, text.cookFileUnderNone);
  none.value = '';
  under.append(none);
  const parents = [
    ...row.options
      .filter((o) => o.target.kind === 'ingredient')
      .map((o) => ({ id: o.target.id, name: o.name })),
    ...row.classes,
  ];
  for (const parent of parents) {
    if ([...under.options].some((o) => o.value === parent.id)) continue;
    const node = el('option', undefined, parent.name);
    node.value = parent.id;
    under.append(node);
  }
  under.value = row.choice.type === 'new' ? (row.choice.parentId ?? '') : '';
  under.hidden = row.choice.type !== 'new' || parents.length === 0;

  select.addEventListener('change', () => {
    const value = select.value;
    if (value === '') choose(model, row.key, { type: 'unset' }, factsOf);
    else if (value === NEW) choose(model, row.key, { type: 'new' }, factsOf);
    else {
      const found = row.options.find((o) => keyOfTarget(o.target) === value);
      if (found) choose(model, row.key, { type: 'existing', target: found.target }, factsOf);
    }
    under.hidden = value !== NEW || parents.length === 0;
    changed(false);
  });
  under.addEventListener('change', () => {
    choose(
      model,
      row.key,
      { type: 'new', ...(under.value === '' ? {} : { parentId: under.value }) },
      factsOf,
    );
    changed(false);
  });
  wrap.append(el('span', 'field-label', row.label), select, under);
  return wrap;
}

export function namesSection(model: CookModel, changed: (names: boolean) => void): HTMLElement {
  const box = el('section', 'cook-names');
  box.append(el('h2', undefined, text.cookNamesHeading), el('p', 'muted', text.cookNamesHint));
  for (const row of model.rows) box.append(nameRow(model, row, changed));
  if (unresolvedNames(model) > 1) {
    const all = el('button', 'btn', text.cookCreateAll);
    all.type = 'button';
    all.addEventListener('click', () => {
      createForUnset(model);
      changed(true);
    });
    box.append(all);
  }
  return box;
}
