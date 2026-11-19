// Scaling a component: the output weight wanted (or a factor when it has no output weight), the
// portions that output gives at a weight the cook enters, and the raw ingredients all the way down.
import { portionsView } from '../components/figures';
import { rawView, scaleFromEntry, type RawView } from '../components/raw';
import type { ComponentRecord, Notebook } from '../records';
import { formatMass, formatNumber } from '../shared/mass';
import { parseEntry } from '../shared/parse';
import { el } from '../shell/el';
import { strings } from '../strings';
import { numberField } from './fields';
import { rawBlock } from './raw-table';

type Ok = Extract<RawView, { ok: true }>;

const caption = (view: Ok, scaleG: number | undefined, hasOutput: boolean): string => {
  if (scaleG !== undefined) return strings.notebook.rawOutput(formatMass(scaleG, 'g'));
  if (!hasOutput && view.factor !== 1)
    return strings.notebook.rawFactor(formatNumber(view.factor, 3));
  return strings.notebook.rawAsWritten;
};

const mark = (input: HTMLInputElement, hint: HTMLElement, invalid: boolean): void => {
  if (invalid) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
  hint.textContent = invalid ? strings.notebook.invalidNumber : '';
};

const liveHint = (): HTMLElement => {
  const hint = el('p', 'hint');
  hint.setAttribute('aria-live', 'polite');
  return hint;
};

/**
 * Three sections that react to the two fields: Scale, Portions (only with an output weight) and
 * the raw list. `recordedG` is the recorded output weight when it can be shown.
 */
export const scaleSections = (
  nb: Notebook,
  component: ComponentRecord,
  recordedG: number | undefined,
): HTMLElement[] => {
  const hasOutput = component.yield !== undefined;
  const scaleField = numberField(
    hasOutput ? strings.components.outputWanted : strings.components.factorLabel,
  );
  const scaleHint = liveHint();
  const portionField = numberField(strings.components.portionWeight);
  const portionHint = liveHint();
  const portionResult = el('p', 'portions-result');
  portionResult.setAttribute('aria-live', 'polite');
  const raw = el('section', 'raw-section');

  const draw = (): void => {
    const entry = parseEntry(scaleField.control.value);
    mark(scaleField.control, scaleHint, entry.kind === 'invalid');
    const scale = scaleFromEntry(component, entry);
    const view = rawView(nb, component, scale);
    raw.replaceChildren(el('h2', undefined, strings.notebook.rawHeading));
    if (view.ok) {
      const wanted = scale.kind === 'output' ? scale.g : undefined;
      raw.append(rawBlock(view, caption(view, wanted, hasOutput)));
    } else raw.append(el('p', 'note-quiet', view.message));

    const portions = parseEntry(portionField.control.value);
    mark(portionField.control, portionHint, portions.kind === 'invalid');
    portionResult.textContent = '';
    const outputG = scale.kind === 'output' ? scale.g : recordedG;
    if (outputG !== undefined) {
      const p = portionsView(outputG, portions);
      if (p.kind === 'ok') {
        portionResult.textContent = strings.components.portionsResult(
          formatNumber(p.portions, 1),
          String(p.whole),
          formatMass(p.remainderG, 'g'),
        );
      }
    }
  };
  scaleField.control.addEventListener('input', draw);
  portionField.control.addEventListener('input', draw);
  draw();

  const scale = el('section', 'scale');
  scale.append(el('h2', undefined, strings.components.scaleHeading), scaleField.wrap, scaleHint);
  if (!hasOutput) return [scale, raw];
  const portions = el('section', 'portions');
  portions.append(
    el('h2', undefined, strings.components.portionsHeading),
    portionField.wrap,
    portionHint,
    portionResult,
  );
  return [scale, portions, raw];
};
