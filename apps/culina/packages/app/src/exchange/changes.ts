// The span of changes in the store, read from the rows' `updatedAt`.
import { KINDS, type ReadStore } from '../store';
import type { ChangeSpan } from './reminder';

export const changeSpan = async (store: ReadStore): Promise<ChangeSpan> => {
  let first: string | undefined;
  let last: string | undefined;
  for (const kind of KINDS) {
    // Skills and the old stock are not in the export file: a change to them is no unexported change.
    if (kind === 'skills' || kind === 'stock') continue;
    const listed = await store.listRows(kind);
    if (!listed.ok) continue;
    for (const row of listed.rows) {
      if (first === undefined || row.updatedAt < first) first = row.updatedAt;
      if (last === undefined || row.updatedAt > last) last = row.updatedAt;
    }
  }
  return { ...(first === undefined ? {} : { first }), ...(last === undefined ? {} : { last }) };
};
