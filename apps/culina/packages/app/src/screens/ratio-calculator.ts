// The calculator on a ratio card: three modes, results per role, a quiet note on cautions.
import type { EffectiveTemplate, UnitId } from '@culina/engine';
import { calculate, cautionsOf, type CalcResult } from '../ratios/calc';
import { formatMass, MASS_UNITS, type MassUnit } from '../ratios/format';
import { parseEntry } from '../ratios/parse';
import { el } from '../shell/el';
import { strings } from '../strings';
import { nextId, numberField, selectField } from './fields';

type Mode = 'role' | 'total' | 'factor';
const MODES: { mode: Mode; label: string }[] = [
  { mode: 'role', label: strings.ratios.modeRole },
  { mode: 'total', label: strings.ratios.modeTotal },
  { mode: 'factor', label: strings.ratios.modeFactor },
];
/** The successful part of a calculation, or nothing. */
const okOnly = (r?: CalcResult): Extract<CalcResult, { ok: true }> | undefined =>
  r?.ok ? r : undefined;
const unitOptions = MASS_UNITS.map((u) => ({ value: u, label: u }));
const fieldLabel: Record<Mode, string> = {
  role: strings.ratios.amountLabel,
  total: strings.ratios.totalLabel,
  factor: strings.ratios.factorLabel,
};

export const calculatorSection = (template: EffectiveTemplate): HTMLElement => {
  const section = el('section', 'calc');
  const heading = el('h2', undefined, strings.ratios.calcHeading);

  // Mode switch: a radio group.
  const modes = el('fieldset', 'choices');
  modes.append(el('legend', undefined, strings.ratios.modeLegend));
  const group = nextId('mode');
  const radios = new Map<Mode, HTMLInputElement>();
  for (const { mode, label } of MODES) {
    const row = el('label', 'choice');
    const radio = el('input');
    radio.type = 'radio';
    radio.name = group;
    radio.value = mode;
    radio.checked = mode === 'role';
    radios.set(mode, radio);
    row.append(radio, el('span', undefined, label));
    modes.append(row);
  }

  const roleSelect = selectField(
    strings.ratios.roleLabel,
    template.parts.map((p) => ({ value: p.role, label: p.role })),
    template.anchor ?? template.parts[0]?.role ?? '',
  );
  const amount = numberField(fieldLabel.role);
  const unit = selectField(strings.ratios.unitLabel, unitOptions, 'g');
  const entryRow = el('div', 'entry-row');
  entryRow.append(amount.wrap, unit.wrap);
  const help = el('p', 'muted', strings.ratios.factorHelp);
  const hint = el('p', 'hint');
  hint.id = nextId('hint');
  hint.setAttribute('aria-live', 'polite');
  amount.control.setAttribute('aria-describedby', hint.id);
  const shownUnit = selectField(strings.ratios.resultUnitLabel, unitOptions, 'g');

  const results = el('div', 'results');
  results.setAttribute('aria-live', 'polite');
  const notes = el('div', 'notes');
  let last: ReturnType<typeof okOnly>;

  const mode = (): Mode => MODES.find((m) => radios.get(m.mode)?.checked)?.mode ?? 'role';

  const drawResults = (dimmed: boolean): void => {
    results.replaceChildren();
    notes.replaceChildren();
    if (last === undefined) {
      results.append(el('p', 'muted', strings.ratios.nothingYet));
      return;
    }
    const unitNow = shownUnit.control.value as MassUnit;
    const table = el('table', dimmed ? 'amounts dimmed' : 'amounts');
    table.append(el('caption', 'sr-only', strings.ratios.resultsHeading));
    const body = el('tbody');
    for (const row of last.rows) {
      const tr = el('tr');
      tr.append(el('th', undefined, row.role), el('td', 'num', formatMass(row.g, unitNow)));
      tr.firstElementChild?.setAttribute('scope', 'row');
      body.append(tr);
    }
    table.append(body);
    results.append(el('h3', undefined, strings.ratios.resultsHeading), table);
    for (const caution of cautionsOf(last)) {
      notes.append(
        el(
          'p',
          'muted',
          caution === 'salt-not-linear' ? strings.ratios.cautionSalt : strings.ratios.cautionTime,
        ),
      );
    }
  };

  const update = (): void => {
    const current = mode();
    const entry = parseEntry(amount.control.value);
    roleSelect.wrap.hidden = current !== 'role';
    unit.wrap.hidden = current === 'factor';
    help.hidden = current !== 'factor';
    amount.label.textContent = fieldLabel[current];
    const invalid = (on: boolean): void => {
      hint.textContent = on ? strings.ratios.invalidNumber : '';
      if (on) amount.control.setAttribute('aria-invalid', 'true');
      else amount.control.removeAttribute('aria-invalid');
    };
    invalid(entry.kind === 'invalid');
    if (entry.kind === 'invalid') {
      drawResults(last !== undefined);
      return;
    }
    if (entry.kind === 'empty') {
      last = undefined;
      drawResults(false);
      return;
    }
    const unitId = unit.control.value as UnitId;
    const next = calculate(
      template,
      current === 'role'
        ? { mode: 'role', role: roleSelect.control.value, value: entry.value, unit: unitId }
        : current === 'total'
          ? { mode: 'total', value: entry.value, unit: unitId }
          : { mode: 'factor', value: entry.value },
    );
    // A number the engine cannot scale (too large) is treated like any entry that is not a number.
    last = okOnly(next) ?? last;
    invalid(!next.ok);
    drawResults(!next.ok);
  };

  for (const node of [amount.control, roleSelect.control, unit.control, ...radios.values()]) {
    node.addEventListener(node === amount.control ? 'input' : 'change', update);
  }
  shownUnit.control.addEventListener('change', () => drawResults(false));

  section.append(
    heading,
    modes,
    roleSelect.wrap,
    entryRow,
    help,
    hint,
    shownUnit.wrap,
    results,
    notes,
  );
  update();
  return section;
};
