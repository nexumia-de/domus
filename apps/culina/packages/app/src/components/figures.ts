// Yield figures of one component (input, output, loss, yield percent) and portions from a weight.
import { componentYield, portionsFromYield } from '@culina/engine';
import type { ComponentRecord, Notebook } from '../records';
import type { Entry } from '../shared/parse';
import { explain } from './names';

export type YieldView =
  | {
      ok: true;
      inputG: number;
      /** Lines without an amount: the input lacks them. */
      partial: boolean;
      /** Lines whose amount cannot be weighed (no density or piece weight): the input lacks them. */
      unweighable: boolean;
      output:
        | { known: true; outputG: number; lossG: number; yieldPct: number; source: string }
        | { known: false };
    }
  | { ok: false; message: string };

export const yieldView = (nb: Notebook, component: ComponentRecord): YieldView => {
  const result = componentYield(component, nb.facts);
  if (!result.ok) return { ok: false, message: explain(result.error, nb, component.percentBase) };
  const { yield: figures } = result;
  return {
    ok: true,
    inputG: result.inputG,
    partial: result.unmeasured.length > 0,
    unweighable: result.unconverted.length > 0,
    output: figures.known
      ? {
          known: true,
          outputG: figures.outputG,
          lossG: figures.lossG,
          yieldPct: figures.yieldPct,
          source: component.yield?.source ?? '',
        }
      : { known: false },
  };
};

export type PortionsView =
  | { kind: 'none' }
  | { kind: 'invalid' }
  | { kind: 'ok'; portions: number; whole: number; remainderG: number };

/** How many portions an output gives at the weight the cook entered. */
export const portionsView = (outputG: number, entry: Entry): PortionsView => {
  if (entry.kind === 'empty') return { kind: 'none' };
  if (entry.kind === 'invalid') return { kind: 'invalid' };
  const result = portionsFromYield(outputG, entry.value);
  if (!result.ok) return { kind: 'invalid' };
  return {
    kind: 'ok',
    portions: result.portions,
    whole: result.wholePortions,
    remainderG: result.remainderG,
  };
};
