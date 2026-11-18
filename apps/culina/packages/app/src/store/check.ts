import { validateModel, type Finding, type ModelInput } from '@culina/engine';
import type { ReadStore } from './repository';
import { fail, KINDS, type Result } from './types';

/**
 * Cross-record validation of everything stored (references, cycles, ranges). It is not run on
 * every write, because a reference may arrive later. `seed` adds the seed records the user's
 * records may refer to; the engine only knows the records it is given.
 */
export const checkStore = async (
  store: ReadStore,
  seed: ModelInput = {},
): Promise<Result<{ findings: readonly Finding[] }>> => {
  const model: Record<string, unknown[]> = {};
  for (const kind of KINDS) {
    const listed = await store.list(kind);
    if (!listed.ok) return fail(listed.error);
    model[kind] = [...((seed[kind] as unknown[] | undefined) ?? []), ...listed.records];
  }
  const checked = validateModel(model as ModelInput);
  return { ok: true, findings: checked.findings };
};
