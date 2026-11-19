// "Compare my amounts": a collapsible section; the range display in neutral words.
import type { EffectiveTemplate } from '@culina/engine';
import { compareAmounts, referenceRole } from '../ratios/compare';
import { ratioRole } from '../ratios/names';
import { el } from '../shell/el';
import { strings } from '../strings';
import { nextId, numberField } from './fields';

export const compareSection = (template: EffectiveTemplate): HTMLElement => {
  const details = el('details', 'guidance compare');
  details.append(el('summary', undefined, strings.ratios.compareSummary));
  details.append(el('p', 'muted', strings.ratios.compareIntro(ratioRole(referenceRole(template)))));

  const texts: Record<string, string> = {};
  const hint = el('p', 'hint');
  hint.id = nextId('hint');
  hint.setAttribute('aria-live', 'polite');
  const out = el('div', 'compare-out');
  out.setAttribute('aria-live', 'polite');

  const draw = (): void => {
    const view = compareAmounts(template, texts);
    out.replaceChildren();
    hint.textContent =
      view.state === 'invalid'
        ? strings.ratios.invalidNumber
        : view.state === 'needs-anchor'
          ? strings.ratios.compareNeedsAnchor(ratioRole(view.anchor))
          : '';
    if (view.state !== 'ok') return;
    const cols = strings.ratios.compareColumns;
    const table = el('table', 'compare-table');
    const head = el('tr');
    for (const [text, cls] of [
      [cols.role, undefined],
      [cols.parts, 'num'],
      [cols.template, 'num'],
      [cols.diff, 'num'],
    ] as const) {
      const th = el('th', cls, text);
      th.scope = 'col';
      head.append(th);
    }
    const thead = el('thead');
    thead.append(head);
    table.append(thead);
    const body = el('tbody');
    for (const row of view.rows) {
      const tr = el('tr');
      const name = el('th', undefined, ratioRole(row.role));
      name.scope = 'row';
      tr.append(
        name,
        el('td', 'num', row.parts),
        el('td', 'num', row.template),
        el('td', 'num', row.diff),
      );
      body.append(tr);
      if (row.phrase !== '') {
        const note = el('tr', 'phrase-row');
        const cell = el('td', 'phrase', row.phrase);
        cell.colSpan = 4;
        note.append(cell);
        body.append(note);
      }
    }
    table.append(body);
    out.append(table);
  };

  for (const part of template.parts) {
    const field = numberField(strings.ratios.compareField(ratioRole(part.role)));
    field.control.setAttribute('aria-describedby', hint.id);
    field.control.addEventListener('input', () => {
      texts[part.role] = field.control.value;
      draw();
    });
    details.append(field.wrap);
  }
  details.append(hint, out);
  return details;
};
