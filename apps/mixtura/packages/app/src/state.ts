// A small store: one state object, shallow patches, subscribers called
// synchronously after a change. Screens are functions of this state.

export type Listener<T> = (state: T, previous: T) => void;

export interface Store<T> {
  get(): T;
  /** Merges the patch; subscribers run only if a value really changed. */
  set(patch: Partial<T>): void;
  subscribe(listener: Listener<T>): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => state,
    set(patch) {
      const keys = Object.keys(patch) as (keyof T)[];
      if (keys.every((key) => Object.is(state[key], patch[key]))) return;
      const previous = state;
      state = { ...state, ...patch };
      for (const listener of [...listeners]) listener(state, previous);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
