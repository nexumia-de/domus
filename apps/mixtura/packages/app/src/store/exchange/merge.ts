// The merge and replace plan is the engine's rule (planImport); the store
// applies it in one transaction (./snapshot.ts).

export { isNoOp, planImport } from '@mixtura/engine';
export type { ImportMode, Plan } from '@mixtura/engine';
