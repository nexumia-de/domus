import { state } from './state';

/** A new record id: `u-` and a lower-case UUID, the user id pattern of the schemas. */
export const newId = (): string => state.newId();
