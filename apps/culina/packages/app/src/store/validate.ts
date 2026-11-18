import * as validators from './validators.generated.js';
import type { Kind, StoreError } from './types';

type Issue = NonNullable<StoreError['issues']>[number];

/** Schema problems of a record: paths and keywords only, never the values. Empty when valid. */
export const schemaIssues = (kind: Kind, record: unknown): Issue[] => {
  const validate = validators[kind];
  if (validate(record)) return [];
  return (validate.errors ?? []).map((e) => ({
    path: e.instancePath === '' ? '/' : e.instancePath,
    keyword: e.keyword,
  }));
};
