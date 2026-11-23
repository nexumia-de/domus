// The import step for a Cooklang file: what was read, then everything the file does not say,
// filled in by the user, and only then one Save. Nothing is stored before that.
import { normaliseName } from '@culina/engine';
import {
  componentParts,
  gramsAllowed,
  lineRoles,
  portionsAllowed,
  unresolvedNames,
  buildCookModel,
  type CookModel,
} from '../../exchange/cook-model';
import { candidateComponents, candidateIngredients, importFacts } from '../../exchange/candidates';
import { undoImport } from '../../exchange/json-apply';
import { saveCookImport } from '../../exchange/cook-save';
import { listComponents, listDishes } from '../../notebook';
import type { IngredientRecord } from '../../records';
import { hashFor } from '../../router';
import { showToast } from '../../shell/toast';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import { storeText } from '../editor/store-text';
import { selectField } from '../fields';
import { textField } from '../editor/form-bits';
import { cookText } from './cook-text';
import { linesSection, linesUsable } from './cook-lines';
import { namesSection } from './cook-names';
import { partsSection } from './cook-parts';
import { radioRow } from './radio';

const text = strings.importing;

const countOf = (model: CookModel) => {
  const segments = model.doc.blocks.flatMap((b) => (b.type === 'step' ? b.segments : []));
  return {
    steps: model.doc.blocks.filter((b) => b.type === 'step').length,
    notes: model.doc.blocks.filter((b) => b.type === 'note').length,
    cookware: segments.filter((s) => s.type === 'cookware').length,
    timers: segments.filter((s) => s.type === 'timer').length,
    locked: model.lines.filter((l) => l.use.quantity?.locked).length,
  };
};

export function renderCookImport(
  host: HTMLElement,
  source: string,
  fileName: string,
  status: HTMLElement,
  /** The shipped catalogue's entries; undefined when it could not be loaded. */
  catalogue?: readonly IngredientRecord[],
): void {
  const model = buildCookModel(source, fileName, {
    ingredients: candidateIngredients(catalogue),
    components: candidateComponents(),
    facts: importFacts(catalogue),
  });
  if (model.lines.length === 0) {
    host.replaceChildren(el('p', 'note', text.cookNoLines));
    return;
  }
  const count = countOf(model);
  const head = el('div', 'cook-head');
  head.append(
    el('h2', undefined, text.cookHeading),
    el('p', 'note', text.cookRead(model.lines.length, count.steps)),
  );
  if (model.dish) head.append(el('p', 'note', text.cookDishRead(componentParts(model).length)));
  if (count.cookware + count.timers + count.notes > 0) {
    head.append(el('p', 'muted', text.cookExtras(count.cookware, count.timers, count.notes)));
  }
  if (count.locked > 0) head.append(el('p', 'muted', text.cookLocked(count.locked)));
  if (catalogue === undefined) head.append(el('p', 'note-quiet', text.cookCatalogueUnavailable));

  const name = textField(model.dish ? text.cookDishNameField : text.cookNameField, model.title);
  // A component has an output weight and a percent base; a dish has portions instead, and each
  // of its components its own percent base (cook-parts.ts).
  const yieldField = textField(text.cookYieldField, model.yieldGrams, true);
  const yieldHint = el('p', 'hint');
  const base = selectField(text.cookBaseField, [{ value: '', label: text.cookBaseNone }], '');
  const portions = textField(text.cookPortionsField, model.portions, true);
  portions.control.inputMode = 'numeric';
  const portionsHint = el('p', 'hint');
  yieldField.wrap.hidden = model.dish;
  base.wrap.hidden = model.dish;
  portions.wrap.hidden = !model.dish;
  const family = el('fieldset', 'choices');
  const namesHost = el('div');
  const linesHost = el('div');
  const save = el('button', 'btn primary', text.cookSave);
  save.type = 'button';
  const need = el('p', 'note-quiet');
  need.setAttribute('role', 'status');

  const sameName = (): { id: string; name: string } | undefined =>
    (model.dish ? listDishes() : listComponents()).find(
      (c) => normaliseName(c.name) === normaliseName(name.control.value),
    );

  const drawFamily = (): void => {
    const existing = sameName();
    family.hidden = existing === undefined;
    if (existing === undefined) return;
    const fresh = radioRow(
      'family',
      'new',
      model.dish ? text.cookNewDish : text.cookNewFamily,
      true,
    );
    const variation = radioRow('family', existing.id, text.cookVariation(existing.name), false);
    family.replaceChildren(el('legend', undefined, text.cookSaveAs), fresh.wrap, variation.wrap);
  };

  const drawBase = (): void => {
    const roles = lineRoles(model.lines);
    const was = base.control.value;
    base.control.replaceChildren(
      ...[
        { value: '', label: text.cookBaseNone },
        ...roles.map((r) => ({ value: r, label: r })),
      ].map((o) => {
        const node = el('option', undefined, o.label);
        node.value = o.value;
        return node;
      }),
    );
    base.control.value = roles.includes(was) ? was : '';
  };

  const yieldValue = (): number | undefined | null => {
    const raw = yieldField.control.value.trim();
    if (raw === '') return undefined;
    return gramsAllowed(raw) ? Number(raw.replace(',', '.')) : null;
  };

  const refresh = (): void => {
    const open = unresolvedNames(model);
    const usable = linesUsable(model);
    const yielded = model.dish ? undefined : yieldValue();
    const portioned = !model.dish || portionsAllowed(portions.control.value);
    const named = componentParts(model).every((p) => !model.dish || p.name.trim() !== '');
    yieldHint.textContent = yielded === null ? text.cookGramsNotAllowed : '';
    portionsHint.textContent = portioned ? '' : text.cookPortionsNotAllowed;
    portions.control.setAttribute('aria-invalid', String(!portioned));
    need.textContent = [
      open > 0 ? text.cookNeedsNames(open) : '',
      named ? '' : text.cookNeedsComponentName,
    ]
      .filter((t) => t !== '')
      .join(' ');
    save.disabled =
      open > 0 ||
      !usable ||
      yielded === null ||
      !portioned ||
      !named ||
      name.control.value.trim() === '';
  };

  const drawLines = (): void => {
    linesHost.replaceChildren(
      model.dish ? partsSection(model, onChange) : linesSection(model, onChange),
    );
  };
  const drawNames = (): void => {
    namesHost.replaceChildren(namesSection(model, onNames));
  };
  function onChange(): void {
    drawBase();
    refresh();
  }
  function onNames(rebuildNames: boolean): void {
    if (rebuildNames) drawNames();
    drawLines();
    onChange();
  }

  name.control.addEventListener('input', () => {
    drawFamily();
    refresh();
  });
  yieldField.control.addEventListener('input', refresh);
  portions.control.addEventListener('input', refresh);

  save.addEventListener('click', () => {
    save.disabled = true;
    const yielded = model.dish ? undefined : yieldValue();
    const portioned = portions.control.value.trim();
    const picked = family.hidden
      ? undefined
      : (family.querySelector<HTMLInputElement>('input:checked')?.value ?? 'new');
    void saveCookImport({
      model,
      name: name.control.value.trim(),
      ...(typeof yielded === 'number' ? { yieldGrams: yielded } : {}),
      ...(model.dish || base.control.value === '' ? {} : { percentBase: base.control.value }),
      ...(model.dish && portioned !== '' ? { portions: Number(portioned) } : {}),
      ...(picked === undefined || picked === 'new' ? {} : { parent: picked }),
      ...(catalogue === undefined ? {} : { catalogue: new Map(catalogue.map((e) => [e.id, e])) }),
    }).then((done) => {
      if (!done.ok) {
        save.disabled = false;
        status.textContent = cookText(done.error.code, storeText);
        return;
      }
      status.textContent = '';
      showToast(text.cookImported(done.name), {
        label: text.undo,
        run() {
          void undoImport().then((r) => showToast(r.ok ? text.undone : storeText(r.error.code)));
        },
      });
      const result = el('div', 'cook-result');
      const link = el(
        'a',
        'btn primary',
        done.kind === 'dishes' ? text.cookOpenDish : text.cookOpenIt,
      );
      link.href = hashFor(done.kind, done.id);
      result.append(
        el('h2', undefined, text.cookSaved(done.name)),
        el('h3', undefined, text.cookUnmeasuredHeading),
      );
      if (done.unmeasured.length === 0) result.append(el('p', 'note', text.cookNoneOpen));
      else {
        const list = el('ul', 'summary-list');
        for (const u of done.unmeasured) {
          list.append(el('li', undefined, text.cookUnmeasuredLine(u.name, u.text)));
        }
        result.append(list);
      }
      result.append(link);
      host.replaceChildren(result);
    });
  });

  host.replaceChildren(
    head,
    name.wrap,
    yieldField.wrap,
    yieldHint,
    base.wrap,
    portions.wrap,
    portionsHint,
    family,
    namesHost,
    linesHost,
    need,
    save,
  );
  drawFamily();
  drawNames();
  drawLines();
  drawBase();
  refresh();
}
