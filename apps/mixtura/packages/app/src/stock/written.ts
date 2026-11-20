// Tells the stock sync that the user changed the stock of a space, so a shared
// space is synced after a short pause. A change that arrived by sync does not
// pass here.

export type WrittenListener = (spaceId: string) => void;

const listeners = new Set<WrittenListener>();

/** Calls `listener` for every space whose data the user changed; returns the way to stop. */
export function onSpaceWritten(listener: WrittenListener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function spaceWritten(spaceId: string): void {
  for (const listener of [...listeners]) listener(spaceId);
}
