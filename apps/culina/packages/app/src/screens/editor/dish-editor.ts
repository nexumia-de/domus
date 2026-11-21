// The dish editor: name, portions, course and cuisine, role slots with a filling (component or ingredient) and an
// amount per portion. Same draft and save rules as the component editor.
import { COUNTRY_CODES, COURSE_IDS } from '@culina/engine';
import { roleLabel } from '../../components/names';
import { courseLabel, cuisineLabel } from '../dish-filter';
import { selectField } from '../fields';
import { stepsEditor } from './component-steps-editor';
import { openRoles } from '../../dishes/roles';
import {
  dishFormFromRecord,
  dishFormToRecord,
  newDishForm,
  type DishForm,
  type DishProblem,
  type SlotForm,
} from '../../editor/dish-form';
import { dishFormFromPick, takeDishPrefill } from '../../editor/prefill';
import { AMOUNT_UNITS, MASS_ONLY, ROLE_IDS, type AmountUnit } from '../../editor/units';
import {
  draftKey,
  headOfFamily,
  saveTasting,
  listComponents,
  listIngredients,
  loadDraft,
  newId,
  notebook,
  saveRecord,
  today,
} from '../../notebook';
import { hashFor } from '../../router';
import { appLang } from '../../shared/locale';
import { displayName } from '../../shared/names';
import { parseEntry } from '../../shared/parse';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { removeWithUndo } from './delete';
import { draftSession } from './draft-session';
import { editorActions } from './editor-actions';
import {
  areaField,
  bareSelect,
  button,
  clearRowProblems,
  fieldError,
  focusFirstError,
  mark,
  showRowProblems,
  textField,
  type RowProblem,
} from './form-bits';
import { picker } from './picker';
import { storeText } from './store-text';
import { versionFields } from './version-fields';
import { asNextVersion, tastingText } from '../../editor/version-save';

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
    case 'step':
      return t.needs.step(p.index + 1);
    case 'step-number':
      return t.needs.stepNumber(p.index + 1);
  }
};

export const dishEditor = (id?: string): HTMLElement => {
  const stored = id === undefined ? undefined : headOfFamily('dishes', id);
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
      // A random pick waiting for a new dish comes first and is kept as the draft at once.
      const prefill = id === undefined ? takeDishPrefill() : undefined;
      const form =
        prefill !== undefined
          ? dishFormFromPick(prefill, newId())
          : isForm(draft)
            ? draft
            : stored
              ? dishFormFromRecord(stored)
              : newDishForm(newId());
      build(screen, form, key, prefill !== undefined || isForm(draft), () => {
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
  // Slots added here whose role nobody chose yet: such a slot takes the role of the component
  // that is picked for it, so that the dish offers that component's alternatives.
  const roleOpen = new WeakSet<SlotForm>();
  let focusAfter: string[] | undefined;
  let rowProblems: ReadonlyMap<number, readonly RowProblem[]> = new Map();
  const changed = (): void => session.change();

  const name = textField(t.nameLabel, form.name);
  const nameError = fieldError(name.control);
  name.control.addEventListener('input', () => {
    form.name = name.control.value;
    if (form.name.trim() !== '') nameError.clear();
    changed();
  });
  const portions = textField(t.portionsLabel, form.portions, true);
  const portionsError = fieldError(portions.control);
  portions.control.addEventListener('input', () => {
    form.portions = portions.control.value;
    portionsError.clear();
    changed();
  });
  // Course and cuisine: optional, the same lists as a classic states; "not stated" comes first.
  const course = selectField(
    t.courseLabel,
    [
      { value: '', label: t.notStated },
      ...COURSE_IDS.map((c) => ({ value: c, label: courseLabel(c) })),
    ],
    form.course ?? '',
  );
  course.control.classList.add('dish-course');
  course.control.addEventListener('change', () => {
    form.course = course.control.value;
    changed();
  });
  const cuisine = selectField(
    t.cuisineLabel,
    [
      { value: '', label: t.notStated },
      ...COUNTRY_CODES.map((c) => ({ value: c, label: cuisineLabel(c) })),
    ],
    form.cuisine ?? '',
  );
  cuisine.control.classList.add('dish-cuisine');
  cuisine.control.addEventListener('change', () => {
    form.cuisine = cuisine.control.value;
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
      ref: { kind: 'component' as const, id: c.version.family },
      name: c.name,
      meta: strings.components.subTag,
    })),
    ...listIngredients().map((i) => ({
      ref: { kind: 'ingredient' as const, id: i.id },
      name: displayName(i, appLang),
    })),
  ];

  /** The name of what fills a slot; `undefined` while nothing is chosen. */
  const fillingOf = (slot: SlotForm): string | undefined => {
    if (slot.ref === undefined) return undefined;
    const nb = notebook();
    return slot.ref.kind === 'ingredient'
      ? nb.ingredientName(slot.ref.id)
      : (nb.components.find((c) => c.id === slot.ref?.id)?.name ?? slot.ref.id);
  };
  const assembly = stepsEditor(form, () => form.slots, changed, fillingOf, {
    prefix: 's',
    usesLegend: t.assemblyUses,
    usesEmpty: t.assemblyNoSlots,
    help: t.assemblyHelp,
  });

  const row = (slot: SlotForm, index: number): HTMLElement => {
    const li = el('li', 'line-edit slot-edit');
    const filling = fillingOf(slot);
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
      roleOpen.delete(slot);
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
      clearRowProblems(li, 'amount', amount.control);
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
          rowProblems = new Map();
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
          rowProblems = new Map();
          open = undefined;
          changed();
          draw();
        },
        `${t.remove}, ${label}`,
      ),
    );
    li.append(el('span', 'field-label', t.slotRole), role, pick, amounts, actions);
    showRowProblems(li, rowProblems.get(index) ?? [], { pick, amount: amount.control });
    if (open === index) {
      li.append(
        picker({
          title: t.pickerSearch,
          items: pickerItems(),
          canCreate: true,
          catalogue: true,
          onPick(ref) {
            slot.ref = ref;
            const usual =
              ref.kind === 'component'
                ? listComponents().find((c) => c.version.family === ref.id)?.role
                : undefined;
            if (usual !== undefined && usual !== '' && roleOpen.has(slot)) slot.role = usual;
            rowProblems = new Map(
              [...rowProblems].map(([i, ps]) => [
                i,
                i === index ? ps.filter((q) => q.target !== 'pick') : ps,
              ]),
            );
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
    // The assembly steps list the fillings: keep them in step with the slots.
    assembly.syncLines();
  };
  draw();

  const addSlot = button(t.addSlot, 'quiet', () => {
    const next = openRoles(form.slots.map((s) => s.role))[0] ?? 'main';
    const added: SlotForm = { role: next, amount: '', unit: 'g' };
    roleOpen.add(added);
    form.slots.push(added);
    open = form.slots.length - 1;
    changed();
    draw();
  });

  const slotsError = fieldError(addSlot);

  /** Each problem at the field it concerns; the bar says only that there is something to check. */
  const showProblems = (problems: readonly DishProblem[]): void => {
    nameError.clear();
    portionsError.clear();
    slotsError.clear();
    const rows = new Map<number, RowProblem[]>();
    const stepProblems = new Map<number, string[]>();
    for (const p of problems) {
      if (p.code === 'step' || p.code === 'step-number') {
        stepProblems.set(p.index, [...(stepProblems.get(p.index) ?? []), needsText(p)]);
      } else if (p.code === 'name') nameError.show(needsText(p));
      else if (p.code === 'portions') portionsError.show(needsText(p));
      else if (p.code === 'no-slots') slotsError.show(needsText(p));
      else {
        const at = rows.get(p.index) ?? [];
        at.push({ target: p.code === 'filling' ? 'pick' : 'amount', text: needsText(p) });
        rows.set(p.index, at);
      }
    }
    rowProblems = rows;
    draw();
    assembly.showProblems(stepProblems);
    status.textContent = t.needs.summary;
    focusFirstError(screen);
  };

  const save = async (): Promise<void> => {
    const built = dishFormToRecord(form, today());
    if (!built.ok) {
      showProblems(built.problems);
      return;
    }
    status.textContent = '';
    const record = asNextVersion(
      built.record,
      form.isNew,
      form.versionNote ?? {},
      newId(),
      today(),
    );
    const done = await saveRecord('dishes', record);
    if (!done.ok) {
      status.textContent = storeText(done.error.code);
      return;
    }
    const tasting = tastingText(form.versionNote ?? {});
    if (tasting !== undefined) {
      await saveTasting({
        id: newId(),
        ref: { kind: 'dish', id: record.id },
        date: today(),
        text: tasting,
      });
    }
    await session.close();
    showToast(t.saved(record.name));
    window.location.hash = hashFor('dishes', record.id);
  };

  screen.append(
    name.wrap,
    nameError.node,
    portions.wrap,
    portionsError.node,
    course.wrap,
    cuisine.wrap,
    note.wrap,
    el('h2', undefined, t.slotsHeading),
    list,
    addSlot,
    slotsError.node,
    el('h2', undefined, t.assemblyHeading),
    assembly.element,
    versionFields(form, changed),
    editorActions({
      isNew: form.isNew,
      onSave: () => void save(),
      onDiscard: () => void session.close().then(restart),
      onDelete: () => void session.close().then(() => removeWithUndo('dishes', form.id, form.name)),
      status,
    }),
  );
};
