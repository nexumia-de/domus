// The drink-specific rules: dilution, ABV, sugar and acid figures, usual
// ranges, the six root templates and pre-diluted batching. They use the
// general model (./model) and are kept apart from it on purpose.
export { chooseDilution, computeBalance, DILUTION } from './balance/index';
export type * from './balance/index';

export { checkRange, ROOT_TEMPLATES, VARIANT_TEMPLATES } from './templates/index';

export { prediluted, roundCount, scaleLine, scaleLines, shelfLife } from './batch/index';
export type * from './batch/index';

export { ALCOHOL_THRESHOLDS, classifyAlcohol } from './alcohol/index';
export type * from './alcohol/index';
