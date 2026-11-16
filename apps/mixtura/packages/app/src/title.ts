import { engineName } from '@mixtura/engine';

/** Placeholder text shown until the first screen exists. */
export function appTitle(): string {
  return `Drink Builder on ${engineName()}`;
}
