// The general template functions and the types model.ts exports. Types
// with a role (`Template`, `MatchLine`, `SlotFill`, ...) are generic here;
// the entry exports their drink shapes from drink-templates/.
export { lineRole } from './slots';
export { assignSlots, lineMl } from './volume';
export type {
  Chosen,
  Range,
  RatioStatus,
  SlotRatio,
  TemplateEvidence,
  Unassigned,
  UnassignedReason,
  UnmeasuredReason,
} from './types';
