// Cooklang completion, part two: the amount and role of every line. The amount modes offered
// depend on what the chosen ingredient is known to weigh; nothing is converted without it.
import { quantityText, resolveAmount } from '@culina/engine';
import type { AmountMode } from '@culina/engine';
import {
  existingTarget,
  gramsAllowed,
  modesFor,
  roleAllowed,
  type CookModel,
  type LineRow,
  type Target,
} from '../../exchange/cook-model';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { nextId } from '../fields';

const text = strings.importing;

const factsOf = (model: CookModel) => (target: Target) =>
  target.kind === 'ingredient' ? (model.facts[target.id] ?? {}) : {};

const modeLabel = (model: CookModel, line: LineRow, mode: AmountMode['mode']): string => {
  const written = quantityText(line.use.quantity);
  if (mode === 'given') return text.cookAsWritten(written);
  if (mode === 'grams') return text.cookWeighed;
  if (mode === 'open') return text.cookLeaveOpen;
  const target = existingTarget(model, line);
  const done = resolveAmount(
    line.use.quantity,
    { mode: 'facts' },
    target === undefined ? {} : factsOf(model)(target),
  );
  return text.cookByFacts(done.ok && done.amount ? String(done.amount.value) : '');
};

/** True when every line's grams and role can be used. */
export const linesUsable = (model: CookModel): boolean =>
  model.lines.every((l) => roleAllowed(l.role) && (l.mode !== 'grams' || gramsAllowed(l.grams)));

function lineRow(model: CookModel, line: LineRow, roles: string, changed: () => void): HTMLElement {
  const item = el('li', 'cook-line');
  const written = quantityText(line.use.quantity);
  item.append(
    el(
      'p',
      'cook-line-title',
      written === '' ? `${line.use.name}: ${text.cookNoQuantity}` : `${line.use.name}: ${written}`,
    ),
  );
  const modes = modesFor(model, line, factsOf(model));
  const select = el('select', 'field');
  select.setAttribute('aria-label', text.cookAmountFor(line.use.name));
  for (const mode of modes) {
    const node = el('option', undefined, modeLabel(model, line, mode));
    node.value = mode;
    select.append(node);
  }
  select.value = line.mode;

  const grams = el('input', 'field');
  grams.type = 'text';
  grams.inputMode = 'decimal';
  grams.autocomplete = 'off';
  grams.value = line.grams;
  grams.setAttribute('aria-label', text.cookGramsFor(line.use.name));
  grams.hidden = line.mode !== 'grams';
  const gramsHint = el('p', 'hint');

  const role = el('input', 'field');
  role.type = 'text';
  role.autocomplete = 'off';
  role.spellcheck = false;
  role.setAttribute('list', roles);
  role.setAttribute('aria-label', text.cookRoleFor(line.use.name));
  role.value = line.role;
  role.placeholder = text.cookRolePlaceholder;
  const roleHint = el('p', 'hint');

  const check = (): void => {
    gramsHint.textContent =
      line.mode === 'grams' && !gramsAllowed(line.grams) ? text.cookGramsNotAllowed : '';
    grams.setAttribute('aria-invalid', String(gramsHint.textContent !== ''));
    roleHint.textContent = roleAllowed(line.role) ? '' : text.cookRoleNotAllowed;
    role.setAttribute('aria-invalid', String(roleHint.textContent !== ''));
  };
  select.addEventListener('change', () => {
    line.mode = select.value as AmountMode['mode'];
    grams.hidden = line.mode !== 'grams';
    check();
    changed();
  });
  grams.addEventListener('input', () => {
    line.grams = grams.value;
    check();
    changed();
  });
  role.addEventListener('input', () => {
    line.role = role.value;
    check();
    changed();
  });
  check();
  item.append(select, grams, gramsHint, role, roleHint);
  return item;
}

export function linesSection(model: CookModel, changed: () => void): HTMLElement {
  const box = el('section', 'cook-lines');
  box.append(el('h2', undefined, text.cookLinesHeading));
  const roles = nextId('roles');
  const list = el('datalist');
  list.id = roles;
  const known = new Set<string>();
  for (const line of model.lines) if (line.role !== '') known.add(line.role);
  for (const role of known) list.append(el('option', undefined, role));
  const ul = el('ul', 'cook-line-list');
  for (const line of model.lines) ul.append(lineRow(model, line, roles, changed));
  box.append(list, el('p', 'muted', text.cookRoleHint), ul);
  return box;
}
