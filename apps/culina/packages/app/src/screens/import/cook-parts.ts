// Cooklang completion for a file with sections: the components the dish will get, one per part
// with ingredient lines, each with its name, its role in the dish, its percent base and the
// amount and role of its lines; a part without lines says what it becomes (the note of the dish,
// or its assembly). Nothing is stored here (docs/behaviour.md, Cooklang files).
import { roleLabel } from '../../components/names';
import { ROLE_IDS } from '../../editor/units';
import {
  lineRoles,
  partLines,
  partPreview,
  type CookModel,
  type PartRow,
} from '../../exchange/cook-model';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { textField } from '../editor/form-bits';
import { selectField } from '../fields';
import { lineList, rolesList } from './cook-lines';

const text = strings.importing;

const originOf = (row: PartRow): string =>
  row.part.name !== undefined
    ? text.cookFromSection(row.part.name)
    : row.part.leading
      ? text.cookBeforeSections
      : text.cookUnnamedSection;

/** Fills a percent base select with the roles of the part's lines; a role gone resets it. */
function drawBase(model: CookModel, row: PartRow, select: HTMLSelectElement): void {
  const roles = lineRoles(partLines(model, row));
  if (!roles.includes(row.percentBase)) row.percentBase = '';
  select.replaceChildren(
    ...[{ value: '', label: text.cookBaseNone }, ...roles.map((r) => ({ value: r, label: r }))].map(
      (o) => {
        const node = el('option', undefined, o.label);
        node.value = o.value;
        return node;
      },
    ),
  );
  select.value = row.percentBase;
}

export function partsSection(model: CookModel, changed: () => void): HTMLElement {
  const box = el('section', 'cook-parts');
  box.append(el('h2', undefined, text.cookPartsHeading), el('p', 'muted', text.cookPartsHint));
  const roles = rolesList(model);
  box.append(roles.list, el('p', 'muted', text.cookRoleHint));
  const redraws: (() => void)[] = [];
  const onLines = (): void => {
    for (const redraw of redraws) redraw();
    changed();
  };
  for (const row of model.parts) {
    const part = el('div', 'cook-part');
    part.append(el('h3', 'cook-part-origin', originOf(row)));
    if (row.part.uses.length === 0) {
      const steps = row.part.blocks.filter((b) => b.type === 'step').length;
      const notes = row.part.blocks.length - steps;
      part.append(
        el(
          'p',
          'note-quiet',
          row.part.leading ? text.cookPartNote : text.cookPartAssembly(steps, notes),
        ),
      );
      // The note's own words, so the cook sees what lands there.
      if (row.part.leading) {
        part.append(el('p', 'cook-part-text', text.cookPartNoteText(partPreview(row))));
      }
      box.append(part);
      continue;
    }
    const name = textField(text.cookNameField, row.name);
    name.control.addEventListener('input', () => {
      row.name = name.control.value;
      changed();
    });
    const roleOptions = [
      ...ROLE_IDS.map((r) => ({ value: r, label: roleLabel(r) })),
      ...(ROLE_IDS.some((r) => r === row.role) ? [] : [{ value: row.role, label: row.role }]),
    ];
    const role = selectField(text.cookSlotRole, roleOptions, row.role);
    role.control.addEventListener('change', () => {
      row.role = role.control.value;
      changed();
    });
    const base = selectField(text.cookBaseField, [], '');
    drawBase(model, row, base.control);
    base.control.addEventListener('change', () => {
      row.percentBase = base.control.value;
      changed();
    });
    redraws.push(() => drawBase(model, row, base.control));
    part.append(
      name.wrap,
      role.wrap,
      base.wrap,
      lineList(model, partLines(model, row), roles.id, onLines),
    );
    box.append(part);
  }
  return box;
}
