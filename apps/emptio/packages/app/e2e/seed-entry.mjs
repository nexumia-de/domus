// Bundled by run.mjs for the page: makes a shared space (with a GitHub storage) in the shared
// database, with the host package's own code, as the Household app does when a space is set up.
// Two devices given the same secret are two devices of one household.
import { createIdbStore, deriveSpace, newSecret, openCollection } from '@nexumia-de/hospes';

/** A new space secret. */
export const makeSecret = () => newSecret();

/** Puts the space of `secret` into this origin's database; returns its id. */
export async function putShared({ secret, name, address, token }) {
  const store = createIdbStore();
  try {
    const { id } = await deriveSpace(secret);
    await store.putSpace({
      id,
      secret,
      name,
      storage: { type: 'github', address, access: { token } },
    });
    return id;
  } finally {
    store.close();
  }
}

/** How many live records the space has in the collection `name`, as the database holds them. */
export async function countRecords(id, name) {
  const store = createIdbStore();
  try {
    const state = await store.readCollection(id, name);
    return state.records.filter((r) => r.deleted !== true).length;
  } finally {
    store.close();
  }
}

/**
 * Opens a file as the storage keeps it (base64 of the sealed text) with the space's secret:
 * the names of the live entries in it, or the reason it cannot be opened.
 */
export async function openFile({ secret, collection, content }) {
  const space = await deriveSpace(secret);
  const text = new TextDecoder().decode(Uint8Array.from(atob(content), (c) => c.charCodeAt(0)));
  const opened = await openCollection(space, collection, text);
  if (!opened.ok) return { error: opened.error };
  return {
    names: opened.document.records.filter((r) => r.deleted !== true).map((r) => r.value?.name),
  };
}
