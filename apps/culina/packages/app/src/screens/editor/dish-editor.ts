// The dish editor: name, portions, role slots with a filling (component or ingredient) and an
// amount per portion. Same draft and save rules as the component editor.
import { roleLabel } from '../../components/names';
import { openRoles } from '../../dishes/roles';
import {
  dishFormFromRecord,
  dishFormToRecord,
  newDishForm,
  type DishForm,
  type DishProblem,
  type SlotForm,
} from '../../editor/dish-form';
import { AMOUNT_UNITS, MASS_ONLY, ROLE_IDS, type AmountUnit } from '../../editor/units';
import {
  draftKey,
  getDish,
  listComponents,
  listIngredients,
  loadDraft,
  newId,
  notebook,
  saveRecord,
  today,
} from '../../notebook';
import { hashFor } from '../../router';
import { parseEntry } from '../../shared/parse';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { removeWithUndo } from './delete';
import { draftSession } from './draft-session';
import { editorActions } from './editor-actions';
import { areaField, bareSelect, button, mark, textField } from './form-bits';
import { picker } from './picker';
import { storeText } from './store-text';

const t = strings.editor;
const isForm = (value: unknown): value is DishForm =>
  typeof value === 'object' && value !== null && Array.isArray((value as DishForm).slots);

const needsText = (p: DishProblem): string => {
  switch (p.code) {
    case 'name':
      return t.needs.name;
    case 'no-slots':
      return t.needs.noSlots;
    case 'filling':
      return t.needs.filling(p.index + 1);
    case 'amount':
      return t.needs.slotAmount(p.index + 1);
    case 'portions':
      return t.needs.portions;
  }
};

export const dishEditor = (id?: string): HTMLElement => {
  const stored = id === undefined ? undefined : getDish(id);
  const screen = el('section', 'screen editor dish-editor');
  const back = el('a', 'back-link', strings.dishes.back);
  back.href = hashFor('dishes');
  const heading = (): HTMLElement => el('h1', undefined, stored ? t.editDish : t.newDish);
  screen.append(back, heading());
  if (id !== undefined && stored === undefined) {
    screen.append(el('p', 'note-quiet', strings.dishes.unknown));
    return screen;
  }
  const key = draftKey('dish', id);
  const start = (): void =>
    void (async () => {
      const draft = await loadDraft(key);
      const form = isForm(draft)
        ? draft
        : stored
          ? dishFormFromRecord(stored)
          : newDishForm(newId());
      build(screen, form, key, isForm(draft), () => {
        screen.replaceChildren(back, heading());
        start();
      });
    })();
  start();
  return screen;
};

const build = (
  screen: HTMLElement,
  form: DishForm,
  key: string,
  dirty: boolean,
  restart: () => void,
): void => {
  const session = draftSession(key, () => form);
  if (dirty) session.change();
  let open: number | undefined;
  let focusAfter: string[] | undefined;
  const changed = (): void => session.change();

  const name = textField(t.nameLabel, form.name);
  name.control.addEventListener('input', () => {
    form.name = name.control.value;
    changed();
  });
  const portions = textField(t.portionsLabel, form.portions, true);
  portions.control.addEventListener('input', () => {
    form.portions = portions.control.value;
    changed();
  });
  const note = areaField(t.noteLabel, form.note);
  note.control.addEventListener('input', () => {
    form.note = note.control.value;
    changed();
  });

  const list = el('ol', 'line-edits');
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');

  const pickerItems = () => [
    ...listComponents().map((c) => ({
      ref: { kind: 'component' as const, id: c.id },
      name: c.name,
      meta: strings.components.subTag,
    })),
    ...listIngredients().map((i) => ({
      ref: { kind: 'ingredient' as const, id: i.id },
      name: i.name,
    })),
  ];

  const row = (slot: SlotForm, index: number): HTMLElement => {
    const li = el('li', 'line-edit slot-edit');
    const nb = notebook();
    const filling =
      slot.ref === undefined
        ? undefined
        : slot.ref.kind === 'ingredient'
          ? nb.ingredientName(slot.ref.id)
          : (nb.components.find((c) => c.id === slot.ref?.id)?.name ?? slot.ref.id);
    const label = t.lineName(index + 1, filling ?? '');
    const role = bareSelect(
      `${t.slotRole}, ${label}`,
      [
        ...ROLE_IDS.map((r) => ({ value: r, label: roleLabel(r) })),
        ...(ROLE_IDS.some((r) => r === slot.role)
          ? []
          : [{ value: slot.role, label: roleLabel(slot.role) }]),
      ],
      slot.role,
    );
    role.addEventListener('change', () => {
      slot.role = role.value;
      changed();
    });
    const pick = el('button', 'btn pick-btn');
    pick.type = 'button';
    pick.dataset.pick = String(index);
    pick.append(el('span', 'pick-name', filling ?? t.fillingPlaceholder));
    if (slot.ref?.kind === 'component') pick.append(el('span', 'tag', strings.components.subTag));
    pick.addEventListener('click', () => {
      open = open === index ? undefined : index;
      draw();
    });
    const amount = textField(t.slotAmount, slot.amount, true);
    amount.label.classList.add('sr-only');
    amount.control.setAttribute('aria-label', `${t.slotAmount}, ${label}`);
    amount.control.addEventListener('input', () => {
      slot.amount = amount.control.value;
      mark(amount.control, parseEntry(slot.amount).kind === 'invalid');
      changed();
    });
    mark(amount.control, parseEntry(slot.amount).kind === 'invalid');
    const units: readonly string[] = slot.ref?.kind === 'component' ? MASS_ONLY : AMOUNT_UNITS;
    const unit = bareSelect(
      `${t.unitLabel}, ${label}`,
      units.map((u) => ({ value: u, label: u })),
      slot.unit,
    );
    unit.addEventListener('change', () => {
      slot.unit = unit.value as AmountUnit;
      changed();
    });
    const amounts = el('div', 'line-amount');
    amounts.append(amount.wrap, unit);

    const move = (by: -1 | 1, text: string, attr: string): HTMLButtonElement => {
      const b = button(
        text,
        'quiet',
        () => {
          const moved = form.slots.splice(index, 1)[0];
          if (moved === undefined) return;
          form.slots.splice(index + by, 0, moved);
          open = undefined;
          focusAfter = [
            `[data-${attr}="${index + by}"]`,
            `[data-${attr === 'up' ? 'down' : 'up'}="${index + by}"]`,
          ];
          changed();
          draw();
        },
        `${text}, ${label}`,
      );
      b.dataset[attr] = String(index);
      return b;
    };
    const up = move(-1, t.moveUp, 'up');
    up.disabled = index === 0;
    const down = move(1, t.moveDown, 'down');
    down.disabled = index === form.slots.length - 1;
    const actions = el('div', 'actions line-actions');
    actions.append(
      up,
      down,
      button(
        t.remove,
        'quiet',
        () => {
          form.slots.splice(index, 1);
          open = undefined;
          changed();
          draw();
        },
        `${t.remove}, ${label}`,
      ),
    );
    li.append(el('span', 'field-label', t.slotRole), role, pick, amounts, actions);
    if (open === index) {
      li.append(
        picker({
          title: t.pickerSearch,
          items: pickerItems(),
          canCreate: true,
          onPick(ref) {
            slot.ref = ref;
            if (ref.kind === 'component' && !(MASS_ONLY as readonly string[]).includes(slot.unit)) {
              slot.unit = 'g';
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

  const draw = (): void => {
    list.replaceChildren(...form.slots.map(row));
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

  const addSlot = button(t.addSlot, 'quiet', () => {
    const next = openRoles(form.slots.map((s) => s.role))[0] ?? 'main';
    form.slots.push({ role: next, amount: '', unit: 'g' });
    open = form.slots.length - 1;
    changed();
    draw();
  });

  const save = async (): Promise<void> => {
    const built = dishFormToRecord(form, today());
    if (!built.ok) {
      status.textContent = built.problems.map(needsText).join(' ');
      return;
    }
    const done = await saveRecord('dishes', built.record);
    if (!done.ok) {
      status.textContent = storeText(done.error.code);
      return;
    }
    await session.close();
    showToast(t.saved(built.record.name));
    window.location.hash = hashFor('dishes', built.record.id);
  };

  screen.append(
    name.wrap,
    portions.wrap,
    note.wrap,
    el('h2', undefined, t.slotsHeading),
    list,
    addSlot,
    editorActions({
      isNew: form.isNew,
      onSave: () => void save(),
      onDiscard: () => void session.close().then(restart),
      onDelete: () => void session.close().then(() => removeWithUndo('dishes', form.id, form.name)),
      status,
    }),
  );
};
