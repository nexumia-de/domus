// Which template a swapped drink follows, and what to say when that changed
// (docs/screens-browse.md#swap-mode). Only the engine's matching decides: a
// template name appears only when `matchSpec` says the swapped lines fit it.
// Pure.

import { matchSpec } from '@mixtura/engine';
import { strings } from '../../strings';
import type { BrowseModel } from '../browse/model';
import type { SpecLine, Template } from '../browse/types';
import { swapStrings } from './swap-strings';

export interface TemplateState {
  template?: Template;
  basis: 'explicit' | 'suggested' | 'none';
}

export interface SwapTemplate extends TemplateState {
  /** One plain sentence when the template is not the one of the saved drink. */
  change?: string;
}

function suggestion(model: BrowseModel, lines: readonly SpecLine[]): Template | undefined {
  const chosen = matchSpec(model.tree, model.templates as Template[], { lines: [...lines] }).chosen;
  return chosen?.known ? model.templateById.get(chosen.templateId) : undefined;
}

/**
 * The template after a swap. The engine is asked without the stored template
 * id, for the saved lines and the swapped lines alike. A swapped drink that
 * fits a template follows it; one that fits none follows none, unless the
 * saved drink did not fit its own stored template either (then the swap
 * changed nothing about the match and the stored template stays).
 */
export function swapTemplate(
  model: BrowseModel,
  original: TemplateState,
  savedLines: readonly SpecLine[],
  swappedLines: readonly SpecLine[],
): SwapTemplate {
  const savedFit = suggestion(model, savedLines);
  const fit = suggestion(model, swappedLines);
  let after: TemplateState;
  if (fit) {
    after =
      original.template?.id === fit.id && original.basis === 'explicit'
        ? original
        : { template: fit, basis: 'suggested' };
  } else if (original.basis === 'explicit' && savedFit?.id !== original.template?.id) {
    after = original;
  } else after = { basis: 'none' };

  if (after.template?.id === original.template?.id) return after;
  const was = original.template?.name;
  const change = after.template
    ? swapStrings.templateNow(after.template.name, was)
    : swapStrings.templateNone(was ?? strings.spec.noTemplate);
  return { ...after, change };
}
