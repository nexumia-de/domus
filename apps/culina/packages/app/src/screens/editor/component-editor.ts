// The component editor: name, role, lines (weight or percent of a reference), yield, notes.
// Everything typed is kept as a draft; Save checks only what cannot be stored.
import { roleLabel } from '../../components/names';
import { switchEntry, chooseReference, referenceIndex } from '../../editor/component-convert';
import {
  formFromRecord,
  formToRecord,
  newComponentForm,
  problemsOf,
  type ComponentForm,
  type LineForm,
  type Problem,
} from '../../editor/component-form';
import { inCycle } from '../../editor/cycle';
import { formFromPrefill, takePrefill } from '../../editor/prefill';
import { asNextVersion, tastingText } from '../../editor/version-save';
import { MASS_ONLY, ROLE_IDS, type MassUnit } from '../../editor/units';
import {
  canonicalLines,
  draftKey,
  familyView,
  getIngredient,
  headOfFamily,
  loadDraft,
  newId,
  notebook,
  saveRecord,
  saveTasting,
  today,
} from '../../notebook';
import { hashFor } from '../../router';
import { parseEntry } from '../../shared/parse';
import { el } from '../../shell/el';
import { showToast } from '../../shell/toast';
import { strings } from '../../strings';
import { linesEditor } from './component-lines-editor';
import { keepsEditor } from './component-keeps-editor';
import { stepsEditor } from './component-steps-editor';
import { removeWithUndo } from './delete';
import { draftSession } from './draft-session';
import { editorActions } from './editor-actions';
import {
  areaField,
  bareSelect,
  button,
  fieldError,
  focusFirstError,
  mark,
  textField,
  type RowProblem,
} from './form-bits';
import { ratioInfo } from './ratio-info';
import { storeText } from './store-text';
import { versionFields } from './version-fields';

const t = strings.editor;
const isForm = (value: unknown): value is ComponentForm =>
  typeof value === 'object' && value !== null && Array.isArray((value as ComponentForm).lines);

const needsText = (p: Problem): string => {
  switch (p.code) {
    case 'name':
      return t.needs.name;
    case 'no-lines':
      return t.needs.noLines;
    case 'ingredient':
      return t.needs.ingredient(p.index + 1);
    case 'amount':
      return t.needs.amount(p.index + 1);
    case 'yield':
      return t.needs.yield;
    case 'cycle':
      return t.needs.cycle;
    case 'step':
      return t.needs.step(p.index + 1);
    case 'step-number':
      return t.needs.stepNumber(p.index + 1);
    case 'keep':
      return t.needs.keep(p.index + 1);
  }
};

/** The editor for a new component (no `id`) or for the stored component `id`. */
export const componentEditor = (id?: string): HTMLElement => {
  // An older version is never edited: the editor opens the current one of its family.
  const stored = id === undefined ? undefined : headOfFamily('components', id);
  const screen = el('section', 'screen editor component-editor');
  const back = el('a', 'back-link', strings.components.back);
  back.href = hashFor('components');
  screen.append(back, el('h1', undefined, stored ? t.editComponent : t.newComponent));
  if (id !== undefined && stored === undefined) {
    screen.append(el('p', 'note-quiet', strings.components.unknown));
    return screen;
  }
  const key = draftKey('component', id);
  const start = (): void =>
    void (async () => {
      const draft = await loadDraft(key);
      let form: ComponentForm;
      let fromRatio = false;
      const prefill = id === undefined ? takePrefill() : undefined;
      if (prefill !== undefined) {
        form = formFromPrefill(prefill, newId());
        fromRatio = true;
      } else if (isForm(draft)) form = draft;
      else form = stored ? formFromRecord(stored) : newComponentForm(newId());
      build(screen, form, key, fromRatio || isForm(draft), restart);
    })();
  const restart = (): void => {
    screen.replaceChildren(back, el('h1', undefined, stored ? t.editComponent : t.newComponent));
    start();
  };
  start();
  return screen;
};

const build = (
  screen: HTMLElement,
  form: ComponentForm,
  key: string,
  dirty: boolean,
  restart: () => void,
): void => {
  const session = draftSession(key, () => form);
  if (dirty) session.change();
  const changed = (): void => {
    session.change();
    syncAll();
  };

  const name = textField(t.nameLabel, form.name);
  const nameError = fieldError(name.control);
  name.control.addEventListener('input', () => {
    form.name = name.control.value;
    if (form.name.trim() !== '') nameError.clear();
    changed();
  });
  const role = bareSelect(
    t.roleLabel,
    [{ value: '', label: t.roleNone }, ...ROLE_IDS.map((r) => ({ value: r, label: roleLabel(r) }))],
    form.role,
  );
  role.addEventListener('change', () => {
    form.role = role.value;
    changed();
  });
  const roleWrap = el('div', 'field-wrap');
  roleWrap.append(el('span', 'field-label', t.roleLabel), role);

  // Entry: weight or percent of a reference.
  const entry = el('fieldset', 'choices');
  entry.append(el('legend', undefined, t.entryLegend));
  const radioGroup = `entry-${form.id}`;
  const radios = (['weight', 'percent'] as const).map((value) => {
    const label = el('label', 'choice');
    const input = el('input');
    input.type = 'radio';
    input.name = radioGroup;
    input.value = value;
    input.checked = form.entry === value;
    input.addEventListener('change', () => switchTo(value));
    label.append(input, el('span', undefined, value === 'weight' ? t.entryWeight : t.entryPercent));
    entry.append(label);
    return input;
  });
  const referenceWrap = el('div', 'field-wrap reference');
  const reference = el('select', 'field');
  reference.setAttribute('aria-label', t.referenceLabel);
  referenceWrap.append(el('span', 'field-label', t.referenceLabel), reference);
  const notice = el('p', 'hint');
  notice.setAttribute('role', 'status');

  const facts = () => notebook().facts;
  const apply = (outcome: ReturnType<typeof switchEntry>): void => {
    if (!outcome.ok) {
      notice.textContent = t.cannotConvert;
      radios.forEach((r) => (r.checked = r.value === form.entry));
      return;
    }
    notice.textContent = '';
    Object.assign(form, outcome.form);
    lines.redraw();
    changed();
  };
  const switchTo = (to: 'weight' | 'percent'): void => apply(switchEntry(form, to, facts()));

  /** The name of a line whose ingredient or component is picked. */
  const pickedName = (line: LineForm): string | undefined => {
    if (line.ref === undefined) return undefined;
    const nb = notebook();
    return line.ref.kind === 'ingredient'
      ? nb.ingredientName(line.ref.id)
      : (nb.components.find((c) => c.id === line.ref?.id)?.name ?? line.ref.id);
  };

  const fillReference = (): void => {
    reference.replaceChildren(new Option(t.referenceChoose, ''));
    form.lines.forEach((line, index) => {
      const label =
        pickedName(line) ?? (line.role === undefined ? undefined : roleLabel(line.role));
      if (label !== undefined) reference.append(new Option(label, String(index)));
    });
    const at = referenceIndex(form);
    reference.value = at < 0 ? '' : String(at);
  };
  reference.addEventListener('change', () => {
    if (reference.value === '') return;
    apply(
      chooseReference(
        form,
        Number(reference.value),
        facts(),
        (ingredient) => getIngredient(ingredient)?.roles?.[0],
      ),
    );
  });

  const lines = linesEditor(form, changed);
  const addRow = el('div', 'actions');
  addRow.append(
    button(t.addIngredient, 'quiet', () => lines.add('ingredient')),
    button(t.addSubComponent, 'quiet', () => lines.add('component')),
  );
  // What concerns the lines as a whole (none yet, a cycle) stands under the buttons that fix it.
  const linesError = fieldError(addRow.querySelector('button') ?? undefined);

  const yieldAmount = textField(t.yieldLabel, form.yieldAmount, true);
  const yieldUnit = bareSelect(
    t.unitLabel,
    MASS_ONLY.map((u) => ({ value: u, label: u })),
    form.yieldUnit,
  );
  const yieldError = fieldError(yieldAmount.control);
  yieldAmount.control.addEventListener('input', () => {
    form.yieldAmount = yieldAmount.control.value;
    delete form.yieldSource;
    if (parseEntry(form.yieldAmount).kind !== 'invalid') yieldError.clear();
    changed();
  });
  yieldUnit.addEventListener('change', () => {
    form.yieldUnit = yieldUnit.value as MassUnit;
    delete form.yieldSource;
    changed();
  });
  const yieldRow = el('div', 'line-amount');
  yieldRow.append(yieldAmount.wrap, yieldUnit);

  const steps = stepsEditor(form, () => form.lines, changed, pickedName);
  const keeps = keepsEditor(form, changed);

  const notes = areaField(t.notesLabel, form.method);
  notes.control.addEventListener('input', () => {
    form.method = notes.control.value;
    changed();
  });

  const info = ratioInfo(form);
  const status = el('p', 'hint');
  status.setAttribute('role', 'status');

  const syncAll = (): void => {
    const percent = form.entry === 'percent';
    referenceWrap.hidden = !percent;
    notice.hidden = notice.textContent === '';
    if (percent) fillReference();
    mark(
      yieldAmount.control,
      problemsOf(form).some((p) => p.code === 'yield'),
    );
    lines.figures();
    steps.syncLines();
    info?.update();
  };

  const actions = editorActions({
    isNew: form.isNew,
    onSave: () => void save(),
    onDiscard: () => {
      void session.close().then(restart);
    },
    onDelete: () => void remove(),
    status,
  });

  /** Each problem at the field it concerns; the bar says only that there is something to check. */
  const showProblems = (problems: readonly Problem[]): void => {
    nameError.clear();
    linesError.clear();
    yieldError.clear();
    const rows = new Map<number, RowProblem[]>();
    const stepProblems = new Map<number, string[]>();
    const keepProblems = new Set<number>();
    const lineProblems: string[] = [];
    for (const p of problems) {
      if (p.code === 'keep') keepProblems.add(p.index);
      else if (p.code === 'step' || p.code === 'step-number') {
        stepProblems.set(p.index, [...(stepProblems.get(p.index) ?? []), needsText(p)]);
      } else if (p.code === 'name') nameError.show(needsText(p));
      else if (p.code === 'yield') yieldError.show(needsText(p));
      else if (p.code === 'ingredient' || p.code === 'amount') {
        const at = rows.get(p.index) ?? [];
        at.push({ target: p.code === 'ingredient' ? 'pick' : 'amount', text: needsText(p) });
        rows.set(p.index, at);
      } else lineProblems.push(needsText(p));
    }
    if (lineProblems.length > 0) linesError.show(lineProblems.join(' '));
    lines.showProblems(rows);
    steps.showProblems(stepProblems);
    keeps.showProblems(keepProblems);
    status.textContent = t.needs.summary;
    focusFirstError(screen);
  };

  const save = async (): Promise<void> => {
    const built = formToRecord(form, today());
    const problems: Problem[] = built.ok ? [] : built.problems;
    if (
      built.ok &&
      inCycle(familyView(), {
        id: form.version?.family ?? form.id,
        lines: canonicalLines(built.record.lines),
      })
    ) {
      problems.push({ code: 'cycle' });
    }
    if (!built.ok || problems.length > 0) {
      showProblems(problems);
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
    const done = await saveRecord('components', record);
    if (!done.ok) {
      status.textContent = storeText(done.error.code);
      return;
    }
    const tasting = tastingText(form.versionNote ?? {});
    if (tasting !== undefined) {
      await saveTasting({
        id: newId(),
        ref: { kind: 'component', id: record.id },
        date: today(),
        text: tasting,
      });
    }
    await session.close();
    showToast(t.saved(record.name));
    window.location.hash = hashFor('components', record.id);
  };

  const remove = async (): Promise<void> => {
    await session.close();
    await removeWithUndo('components', form.id, form.name);
  };

  screen.append(
    name.wrap,
    nameError.node,
    roleWrap,
    entry,
    referenceWrap,
    notice,
    el('h2', undefined, t.linesHeading),
    lines.element,
    addRow,
    linesError.node,
    el('h2', undefined, t.stepsHeading),
    steps.element,
    el('h2', undefined, t.yieldHeading),
    yieldRow,
    yieldError.node,
    el('p', 'muted', t.yieldHelp),
    el('h2', undefined, t.keepsHeading),
    keeps.element,
    notes.wrap,
  );
  if (info) screen.append(info.element);
  screen.append(versionFields(form, changed, form.isNew), actions);
  syncAll();
};
