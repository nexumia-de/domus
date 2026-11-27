// The persons of a space and who uses this device. A person is a record of the collection `space`
// with the key `person:<id>` and the value `{ name }`, so every device of the space learns them
// with the space's name. Which person this device is stays on the device: `personId` of the
// stored space. A space has no access rights: anyone with the invite can rename anyone. See
// docs/persons.md.
import type { SyncRecord } from '@nexumia-de/materia';
import { localChange } from './cycle';
import { bytesToBase64Url } from './base64url';
import { SPACE_COLLECTION, cleanSpaceName } from './space-setup';
import type { RandomBytes } from './space';
import type { Store } from './store';

const PREFIX = 'person:';

export interface Person {
  id: string;
  name: string;
}

/** A person's name as stored: trimmed, 1 to 60 characters; undefined otherwise. */
export const cleanPersonName = cleanSpaceName;

/** The live persons among the records of `space`, sorted by name. Foreign values are skipped. */
export function personsOf(records: readonly SyncRecord[]): Person[] {
  const persons: Person[] = [];
  for (const { key, deleted, value } of records) {
    if (deleted || !key.startsWith(PREFIX)) continue;
    const name = (value as { name?: unknown } | null)?.name;
    if (typeof name === 'string' && cleanPersonName(name) !== undefined) {
      persons.push({ id: key.slice(PREFIX.length), name });
    }
  }
  return persons.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}

/** The persons of a space as stored on this device. */
export async function readPersons(store: Store, spaceId: string): Promise<Person[]> {
  return personsOf((await store.readCollection(spaceId, SPACE_COLLECTION)).records);
}

/** The person this device is in the space, while that person is still in it. */
export async function devicePerson(store: Store, spaceId: string): Promise<Person | undefined> {
  const space = await store.getSpace(spaceId);
  if (space?.personId === undefined) return undefined;
  return (await readPersons(store, spaceId)).find((p) => p.id === space.personId);
}

/** Says which person this device is; undefined forgets it. */
export async function setDevicePerson(
  store: Store,
  spaceId: string,
  personId: string | undefined,
): Promise<void> {
  const space = await store.getSpace(spaceId);
  if (!space) return;
  const next = { ...space };
  if (personId === undefined) delete next.personId;
  else next.personId = personId;
  await store.putSpace(next);
}

export interface PersonDeps {
  store: Store;
  now: () => string;
  random?: RandomBytes;
}

const newPersonId = (random: RandomBytes | undefined): string =>
  bytesToBase64Url(random ? random(12) : crypto.getRandomValues(new Uint8Array(12)));

/**
 * Adds a person to the space and, with `asDevice`, makes this device that person.
 * @returns The person, or undefined for a name that is empty or too long.
 */
export async function addPerson(
  spaceId: string,
  name: string,
  deps: PersonDeps,
  asDevice = true,
): Promise<Person | undefined> {
  const clean = cleanPersonName(name);
  if (clean === undefined) return undefined;
  const person = { id: newPersonId(deps.random), name: clean };
  await localChange(deps.store, spaceId, SPACE_COLLECTION, deps.now, () => ({
    put: [{ key: PREFIX + person.id, value: { name: clean } }],
  }));
  if (asDevice) await setDevicePerson(deps.store, spaceId, person.id);
  return person;
}

/** Renames a person; false for a name that is empty or too long. */
export async function renamePerson(
  spaceId: string,
  personId: string,
  name: string,
  deps: Omit<PersonDeps, 'random'>,
): Promise<boolean> {
  const clean = cleanPersonName(name);
  if (clean === undefined) return false;
  await localChange(deps.store, spaceId, SPACE_COLLECTION, deps.now, () => ({
    put: [{ key: PREFIX + personId, value: { name: clean } }],
  }));
  return true;
}

/**
 * The person this device is, made first when there is none: a space on this device only needs no
 * question, its one person gets `name` (the app's word for "Me").
 */
export async function ensureDevicePerson(
  spaceId: string,
  name: string,
  deps: PersonDeps,
): Promise<Person | undefined> {
  return (await devicePerson(deps.store, spaceId)) ?? addPerson(spaceId, name, deps);
}
