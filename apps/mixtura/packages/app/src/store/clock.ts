// The instant the store uses for its own bookkeeping: ISO 8601 in UTC. Passed
// in wherever it is needed, so tests stay deterministic.

export type Clock = () => string;

export const systemClock: Clock = () => new Date().toISOString();
