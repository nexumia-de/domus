// The short line under a component name in the list.
import type { ComponentRecord } from '../records';
import { roleLabel } from './names';

/** Under the name in the list: the role the component usually fills, when it has one. */
export const componentMeta = (component: ComponentRecord): string =>
  component.role === undefined ? '' : roleLabel(component.role);
