// The lines of a component in the editor: ingredient or sub-component, amount and unit, the
// live figure from the engine, move up / down / remove, and the picker for each line.
import { roleLabel } from '../../components/names';
import { wouldCycle } from '../../editor/cycle';
import { lineFigures } from '../../editor/figures';
import type { ComponentForm, LineForm } from '../../editor/component-form';
import { AMOUNT_UNITS, MASS_ONLY, type EntryUnit } from '../../editor/units';
import { listComponents, listIngredients, notebook } from '../../notebook';
import { formatMass, formatNumber } from '../../shared/mass';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { bareSelect, button, mark, textField } from './form-bits';
import { picker, type PickerItem } from './picker';
import { parseEntry } from '../../shared/parse';

const t = strings.editor;

export interface LinesEditor {
  element: HTMLElement;
  /** Rebuilds the rows (after a structural change made elsewhere, like the mode). */
  redraw(): void;
  /** Refreshes the live figures and the marks of the amounts. */
  figures(): void;
  /** Opens the picker on a new empty line. */
  add(kind: 'ingredient' | 'component'): void;
}

export const linesEditor = (form: ComponentForm, changed: () => void): LinesEditor => {
  const list = el('ol', 'line-edits');
  let open: { index: number; kind: 'ingredient' | 'component' } | undefined;
  let focusAfter: string[] | undefined;

  const items = (kind: 'ingredient' | 'component', index: number): PickerItem[] => {
    if (kind === 'ingredient') {
      return listIngredients().map((i) => ({
        ref: { kind: 'ingredient' as const, id: i.id },
        name: i.name,
        ...(i.roles === undefined ? {} : { meta: i.roles.map(roleLabel).join(', ') }),
      }));
    }
    const others = form.lines.flatMap((l, i) => (i !== index && l.ref ? [{ ref: l.ref }] : []));
    return listComponents().map((c) => {
      const blocked =
        c.id === form.id
          ? t.pickerSelf
          : wouldCycle(listComponents(), { id: form.id, lines: others }, c.id)
            ? t.pickerUses
            : undefined;
      return {
        ref: { kind: 'component' as const, id: c.id },
        name: c.name,
        ...(blocked === undefined ? {} : { blocked }),
      };
    });
  };

  const unitsFor = (line: LineForm): readonly string[] =>
    line.ref?.kind === 'component' ? MASS_ONLY : AMOUNT_UNITS;

  const row = (line: LineForm, index: number): HTMLElement => {
    const li = el('li', 'line-edit');
    const nb = notebook();
    const name =
      line.ref === undefined
        ? line.ref
        : line.ref.kind === 'ingredient'
          ? nb.ingredientName(line.ref.id)
          : (nb.components.find((c) => c.id === line.ref?.id)?.name ?? line.ref.id);
    const kind = line.ref?.kind ?? 'ingredient';
    const pick = el('button', 'btn pick-btn');
    pick.type = 'button';
    pick.dataset.pick = String(index);
    pick.append(
      el(
        'span',
        'pick-name',
        name ?? (kind === 'component' ? t.componentPlaceholder : t.ingredientPlaceholder),
      ),
    );
    if (line.ref?.kind === 'component') pick.append(el('span', 'tag', strings.components.subTag));
    pick.addEventListener('click', () => {
      open = open?.index === index ? undefined : { index, kind };
      draw();
    });

    const amount = textField(t.amountLabel, line.amount, true);
    amount.label.classList.add('sr-only');
    amount.control.setAttribute(
      'aria-label',
      `${t.amountLabel}, ${t.lineName(index + 1, name ?? '')}`,
    );
    amount.control.addEventListener('input', () => {
      line.amount = amount.control.value;
      mark(amount.control, parseEntry(line.amount).kind === 'invalid');
      changed();
      showFigures();
    });
    mark(amount.control, parseEntry(line.amount).kind === 'invalid');
    const unit =
      line.unit === 'percent'
        ? el('span', 'unit-fixed', t.percentUnit)
        : bareSelect(
            `${t.unitLabel}, ${t.lineName(index + 1, name ?? '')}`,
            unitsFor(line).map((u) => ({ value: u, label: u })),
            line.unit,
          );
    if (unit instanceof HTMLSelectElement) {
      unit.addEventListener('change', () => {
        line.unit = unit.value as EntryUnit;
        changed();
        showFigures();
      });
    }
    const amounts = el('div', 'line-amount');
    amounts.append(amount.wrap, unit);

    const figure = el('p', 'line-figure muted');
    figure.dataset.figure = String(index);

    const lineName = t.lineName(index + 1, name ?? '');
    const move = (by: -1 | 1, label: string, key: string, other: string) =>
      button(
        label,
        'quiet',
        () => {
          const to = index + by;
          const moved = form.lines.splice(index, 1)[0];
          if (moved === undefined) return;
          form.lines.splice(to, 0, moved);
          if (open) open = undefined;
          focusAfter = [`[data-${key}="${to}"]`, `[data-${other}="${to}"]`];
          changed();
          draw();
        },
        `${label}, ${lineName}`,
      );
    const up = move(-1, t.moveUp, 'up', 'down');
    up.dataset.up = String(index);
    up.disabled = index === 0;
    const down = move(1, t.moveDown, 'down', 'up');
    down.dataset.down = String(index);
    down.disabled = index === form.lines.length - 1;
    const remove = button(
      t.remove,
      'quiet',
      () => {
        form.lines.splice(index, 1);
        open = undefined;
        changed();
        draw();
      },
      `${t.remove}, ${lineName}`,
    );
    const actions = el('div', 'actions line-actions');
    actions.append(up, down, remove);

    li.append(pick, amounts, figure, actions);
    if (open?.index === index) {
      li.append(
        picker({
          title: t.pickerSearch,
          items: items(open.kind, index),
          canCreate: open.kind === 'ingredient',
          onPick(ref) {
            line.ref = ref;
            if (
              ref.kind === 'component' &&
              !(MASS_ONLY as readonly string[]).includes(line.unit) &&
              line.unit !== 'percent'
            ) {
              line.unit = 'g';
            }
            open = undefined;
            focusAfter = [`[data-pick="${index}"]`];
            changed();
            draw();
          },
          onClose() {
            open = undefined;
            focusAfter = [`[data-pick="${index}"]`];
            draw();
          },
        }),
      );
      queueMicrotask(() => li.querySelector<HTMLInputElement>('.picker input')?.focus());
    }
    return li;
  };

  const showFigures = (): void => {
    const nb = notebook();
    const found = lineFigures(nb, form);
    form.lines.forEach((line, index) => {
      const node = list.querySelector<HTMLElement>(`[data-figure="${index}"]`);
      if (node === null) return;
      const figure = found[index];
      let text = '';
      if (figure?.g !== undefined && line.unit === 'percent')
        text = t.equalsG(formatMass(figure.g, 'g'));
      else if (
        figure?.percent !== undefined &&
        form.percentBase !== undefined &&
        line.unit !== 'percent'
      ) {
        text = t.percentOf(formatNumber(figure.percent, 1), roleLabel(form.percentBase));
      }
      node.textContent = text;
    });
  };

  const draw = (): void => {
    list.replaceChildren(...form.lines.map(row));
    showFigures();
    for (const selector of focusAfter ?? []) {
      const target = list.querySelector<HTMLButtonElement>(selector);
      if (target && !target.disabled) {
        target.focus();
        break;
      }
    }
    focusAfter = undefined;
  };
  draw();

  return {
    element: list,
    redraw: draw,
    figures: showFigures,
    add(kind) {
      form.lines.push({ amount: '', unit: 'g' });
      open = { index: form.lines.length - 1, kind };
      changed();
      draw();
    },
  };
};
