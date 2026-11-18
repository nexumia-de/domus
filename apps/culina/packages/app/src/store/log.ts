import type { Kind } from './types';

/**
 * Store logging: ids and counts only. `RecordId` is a brand that `toId` hands out only for
 * strings shaped like an id, so names, notes or other text cannot be passed by accident.
 */
declare const idBrand: unique symbol;
export type RecordId = string & { readonly [idBrand]: true };

const ID_SHAPE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const toId = (value: unknown): RecordId =>
  (typeof value === 'string' && value.length <= 80 && ID_SHAPE.test(value)
    ? value
    : '(not-an-id)') as RecordId;

export type StoreEvent =
  | 'open'
  | 'put'
  | 'remove'
  | 'put-many'
  | 'replace-all'
  | 'revert'
  | 'migrate-start'
  | 'migrate-step'
  | 'migrate-done'
  | 'migrate-failed'
  | 'refused';

export interface LogDetail {
  kind?: Kind;
  count?: number;
  ids?: readonly RecordId[];
  /** Schema versions, for migrations. */
  from?: number;
  to?: number;
}

export type LogSink = (event: StoreEvent, detail: LogDetail) => void;

const debugSink: LogSink = (event, detail) => console.debug('culina store', event, detail);

const debugFlagSet = (): boolean => {
  try {
    return globalThis.localStorage?.getItem('culina.debug') === '1';
  } catch {
    return false;
  }
};

let sink: LogSink | null = null;

/** Tests set their own sink; null restores the default. */
export const setStoreLogSink = (next: LogSink | null): void => {
  sink = next;
};

/** A no-op unless the sink is set or `localStorage['culina.debug']` is `1`. */
export const storeLog: LogSink = (event, detail) => {
  const target = sink ?? (debugFlagSet() ? debugSink : null);
  target?.(event, detail);
};
