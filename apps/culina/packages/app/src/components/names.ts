// Names for references and roles, and the plain-words reasons for engine errors.
import { componentLineGrams } from '@culina/engine';
import type { ComponentError, ComponentRef } from '@culina/engine';
import type { Notebook } from '../records';
import { appLang } from '../shared/locale';
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

/** "a sauce", "an acid", "eine Soße"; an unknown role id gets "a" ("ein" in German). */
export const roleInvite = (role: string): string =>
  (strings.roleInvite as Record<string, string | undefined>)[role] ??
  `${appLang === 'de' ? 'ein' : 'a'} ${role}`;

const componentName = (nb: Notebook, id: string | undefined): string =>
  id === undefined ? '' : refName(nb, { kind: 'component', id });

/**
 * Why a run of a component cannot be scaled on a dish (`no-yield` where a run is taken as what
 * goes in): the first line of it that cannot be weighed, and what would help; else (no yield and
 * a run not weighed by its input, such as one that holds kitchen water) that its output is not
 * weighed.
 */
export const cannotScale = (nb: Notebook, componentId: string): string => {
  const text = strings.notebook.problem;
  const component = nb.components.find((c) => c.id === componentId);
  const name = componentName(nb, componentId);
  if (component === undefined) return text.noYield(name);
  const lines = componentLineGrams(component, nb.facts);
  const first = lines.ok ? lines.unconverted[0] : undefined;
  const line = first === undefined ? undefined : component.lines[first.index];
  return line === undefined ? text.noYield(name) : text.lineUnweighed(name, refName(nb, line.ref));
};

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
