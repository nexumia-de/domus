// The sync cycle of a place: see docs/sync-cycle.md.
export { applyOutcome } from './apply';
export { syncPlace, type SyncInput } from './cycle';
export { movePlace, type MoveInput, type MoveOutcome } from './move';
export type { SyncOutcome, SyncFailure, SyncOk, SyncMoved, MergedState } from './outcome';
export { nextState, type BindingState } from './state';
