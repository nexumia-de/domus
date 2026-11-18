// Tells the sync scheduler that a place's stored data was changed by the user
// (a stock mark, a rename), so a bound place is synced after a short pause.
// A change that arrived by sync does not pass here.

export type WrittenListener = (placeId: string) => void;

const listeners = new Set<WrittenListener>();

/** Calls `listener` for every place whose data the user changed; returns the way to stop. */
export function onPlaceWritten(listener: WrittenListener): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function placeWritten(placeId: string): void {
  for (const listener of [...listeners]) listener(placeId);
}
