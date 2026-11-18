import type { ErrorCode } from '../../store';
import { strings } from '../../strings';

/** The quiet sentence for a store error code. */
export const storeText = (code: ErrorCode | string): string => {
  const text = strings.store;
  switch (code) {
    case 'quota-exceeded':
      return text.quotaExceeded;
    case 'newer-schema':
      return text.newerSchema;
    case 'migration-failed':
      return text.migrationFailed;
    case 'invalid-record':
      return text.invalidRecord;
    case 'not-found':
      return text.notFound;
    default:
      return text.unavailable;
  }
};
