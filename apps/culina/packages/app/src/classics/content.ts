// The shipped content the screens read: the classics and the techniques. A page opened with
// `?e2e-content` may carry its own on `globalThis.__culinaContent` (set before the app loads), so
// the browser tests run on a fictional example; without that query nothing is read from there.
import { TECHNIQUES } from '@culina/engine';
import type { Classic, Technique } from '@culina/engine';
import { CLASSICS } from './index';

interface Override {
  classics?: readonly Classic[];
  techniques?: readonly Technique[];
}

const override = (): Override | undefined => {
  try {
    if (!new URLSearchParams(globalThis.location.search).has('e2e-content')) return undefined;
    return (globalThis as { __culinaContent?: Override }).__culinaContent;
  } catch {
    return undefined;
  }
};

/** Every classic that is shown. */
export const classics = (): readonly Classic[] => override()?.classics ?? CLASSICS;

/** Every technique the engine knows. */
export const techniques = (): readonly Technique[] => override()?.techniques ?? TECHNIQUES;

/** One classic by id, or `undefined`. */
export const classicOf = (id: string): Classic | undefined => classics().find((c) => c.id === id);
