// The ratio range, as information only: where the amounts of a component made from a ratio lie
// against the ratio's usual range, in the neutral words of the ratio card. Never blocks saving.
import { resolveTemplate, SEED_TEMPLATES } from '@culina/engine';
import { lineFigures } from '../../editor/figures';
import type { ComponentForm } from '../../editor/component-form';
import { notebook } from '../../notebook';
import { compareAmounts } from '../../ratios/compare';
import { el } from '../../shell/el';
import { strings } from '../../strings';

/** The block, or nothing when the component is not made from a ratio. */
export const ratioInfo = (
  form: ComponentForm,
): { element: HTMLElement; update(): void } | undefined => {
  const template = SEED_TEMPLATES.find((tpl) => tpl.id === form.templateId);
  const resolved =
    template === undefined ? undefined : resolveTemplate(SEED_TEMPLATES, template.id);
  if (template === undefined || resolved === undefined || !resolved.ok) return undefined;
  const box = el('section', 'ratio-info');
  box.append(el('h2', undefined, strings.editor.rangeHeading));
  box.append(el('p', 'muted', strings.editor.rangeInfo(template.name)));
  const list = el('ul', 'plain-list');
  list.setAttribute('aria-live', 'polite');
  box.append(list);
  return {
    element: box,
    update() {
      const figures = lineFigures(notebook(), form);
      const texts: Record<string, string> = {};
      form.lines.forEach((line, index) => {
        const g = figures[index]?.g;
        if (line.role === undefined || g === undefined) return;
        texts[line.role] = String((Number(texts[line.role] ?? 0) || 0) + g);
      });
      const view = compareAmounts(resolved.template, texts);
      list.replaceChildren();
      if (view.state !== 'ok') return;
      for (const row of view.rows) {
        if (row.phrase !== '') list.append(el('li', undefined, `${row.role}: ${row.phrase}`));
      }
    },
  };
};
