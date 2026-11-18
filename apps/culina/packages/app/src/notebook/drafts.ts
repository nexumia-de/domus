// Drafts of the editors, through the store's `drafts` object store. Without a store they are
// quietly not kept: the editor works, only leaving the screen loses the unsaved form.
import { state } from './state';

export const draftKey = (kind: 'component' | 'dish', id: string | undefined): string =>
  `${kind}:${id ?? 'new'}`;

export const loadDraft = async (key: string): Promise<unknown> => {
  const got = await state.store?.drafts.get(key);
  return got?.ok ? got.draft?.value : undefined;
};

export const keepDraft = async (key: string, value: unknown): Promise<void> => {
  await state.store?.drafts.put(key, value);
};

export const dropDraft = async (key: string): Promise<void> => {
  await state.store?.drafts.remove(key);
};
