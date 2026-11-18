// Names for references and roles, and the plain-words reasons for engine errors.
import type { ComponentError, ComponentRef } from '@culina/engine';
import type { Notebook } from '../records';
import { strings } from '../strings';

/** The visible name of an ingredient or component; the id itself when the record is not there. */
export const refName = (nb: Notebook, ref: ComponentRef): string =>
  ref.kind === 'ingredient'
    ? nb.ingredientName(ref.id)
    : (nb.components.find((c) => c.id === ref.id)?.name ?? ref.id);

const capitalised = (id: string): string => id.charAt(0).toUpperCase() + id.slice(1);

/** "Sauce", "Main element"; an unknown role id is shown capitalised. */
export const roleLabel = (role: string): string =>
  (strings.roles as Record<string, string | undefined>)[role] ?? capitalised(role);

/** "a sauce", "an acid"; an unknown role id gets "a". */
export const roleInvite = (role: string): string =>
  (strings.roleInvite as Record<string, string | undefined>)[role] ?? `a ${role}`;

const componentName = (nb: Notebook, id: string | undefined): string =>
  id === undefined ? '' : refName(nb, { kind: 'component', id });

/**
 * What an engine error means, in plain words and no verdict. The screens show this line
 * where the amounts would be, and render the rest of the screen as usual.
 */
export const explain = (error: ComponentError, nb: Notebook, percentBase?: string): string => {
  const text = strings.notebook.problem;
  switch (error.code) {
    case 'cycle':
      return text.cycle((error.path ?? []).map((id) => componentName(nb, id)).join(', '));
    case 'unknown-component':
      return text.unknownComponent(componentName(nb, error.componentId));
    case 'no-yield':
      return text.noYield(componentName(nb, error.componentId));
    case 'cannot-convert': {
      const owner = nb.components.find((c) => c.id === error.componentId);
      const line = error.index === undefined ? undefined : owner?.lines[error.index];
      return text.cannotConvert(line === undefined ? '' : refName(nb, line.ref));
    }
    case 'no-percent-base':
      return text.noPercentBase(percentBase ?? 'base');
    case 'component-needs-mass':
      return text.needsMass(componentName(nb, error.componentId));
    default:
      return text.unusable;
  }
};
