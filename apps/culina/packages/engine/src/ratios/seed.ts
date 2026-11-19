// The seed templates: only verified rows of docs/ratios.md (see docs/engine-rules.md).
import seed from '../../data/templates.json';
import type { RatioTemplate } from './types';

/** The seed templates in stored shape; each names its source row in `source`. */
export const SEED_TEMPLATES: readonly RatioTemplate[] = seed as unknown as RatioTemplate[];
