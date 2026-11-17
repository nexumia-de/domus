// The drink-specific rules: the drink ingredient and its inherited
// properties, dilution, ABV, sugar and acid figures, matching and variants
// of drink templates, usual ranges, the six root templates and pre-diluted
// batching. They use the
// general model (./model) and are kept apart from it on purpose.
export { chooseDilution, computeBalance, computePrepared, DILUTION } from './balance/index';
export type * from './balance/index';

export {
  checkRange,
  matchSpec,
  ROOT_TEMPLATES,
  VARIANT_TEMPLATES,
  variantSuggestions,
} from './drink-templates/index';
export type * from './drink-templates/index';

export { prediluted, roundCount, scaleLine, scaleLines, shelfLife } from './batch/index';
export type * from './batch/index';

export {
  ALCOHOL_PRESETS,
  ALCOHOL_THRESHOLDS,
  alcoholThresholds,
  classifyAlcohol,
} from './alcohol/index';
export type * from './alcohol/index';

export { INHERITED, resolveAll, resolveProperty } from './drink-ingredients/index';
export type * from './drink-ingredients/index';

export { diffSpecs } from './drink-specs/index';
export type * from './drink-specs/index';
