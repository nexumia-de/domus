// Runs vectors/sync (merge, stamps, pruning, collection, sealed file, invite)
// and checks the two properties of the merge, symmetry and idempotence, over
// the vectors and over generated cases from a seeded generator.
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from 'vitest';
import {
  buildCollection,
  buildInvite,
  buildSealed,
  instantMs,
  latestStamp,
  mergeRecords,
  nextStamp,
  parseCollection,
  parseInvite,
  parseSealed,
  planCollectionSync,
  pruneTombstones,
  sealedAad,
  type CollectionDocument,
  type Invite,
  type LocalCollectionState,
  type Sealed,
  type SyncRecord,
} from '../src/index';
import { validate } from './helpers/json-schema';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const dir = fileURLToPath(new URL('../vectors/sync/', import.meta.url));
const schema = read(`${dir}sync-vector.schema.json`);
const vectors = readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.includes('schema'))
  .map((f) => ({ file: f, v: read(`${dir}${f}`) }));

type Input = {
  local: never;
  remote: never;
  now: never;
  latest: never;
  records: never;
  horizonDays: never;
  options: never;
  collection: never;
  space: never;
  invite: never;
  sealed: never;
  value: never;
  text?: string;
  json?: unknown;
};
type Case = { name: string; input: Input; expected: unknown };
type Rec = SyncRecord<unknown>;
const text = (input: Input) =>
  typeof input.text === 'string' ? input.text : JSON.stringify(input.json);

describe('sync vectors', () => {
  test('they validate and carry their file name as id', () => {
    expect(vectors.length).toBeGreaterThanOrEqual(10);
    for (const { file, v } of vectors) {
      expect(validate(schema, v), file).toEqual([]);
      expect(`${v.id}.json`).toBe(file);
    }
  });
  test('there are vectors for every kind', () => {
    expect(new Set(vectors.map((x) => x.v.kind))).toEqual(
      new Set([
        'merge',
        'stamp',
        'latest-stamp',
        'prune',
        'collection-parse',
        'collection-build',
        'collection-plan',
        'sealed-parse',
        'sealed-build',
        'sealed-aad',
        'invite-parse',
        'invite-build',
      ]),
    );
  });
  for (const { file, v } of vectors) {
    describe(file, () => {
      for (const c of v.cases as Case[]) {
        const i = c.input;
        if (v.kind === 'merge') {
          test(c.name, () => expect(mergeRecords(i.local, i.remote)).toEqual(c.expected));
        } else if (v.kind === 'stamp') {
          test(c.name, () =>
            expect({ stamp: nextStamp(i.now, i.latest) ?? null }).toEqual(c.expected),
          );
        } else if (v.kind === 'latest-stamp') {
          test(c.name, () => expect({ stamp: latestStamp(i.records) ?? null }).toEqual(c.expected));
        } else if (v.kind === 'prune') {
          test(c.name, () =>
            expect(pruneTombstones(i.records, i.now, i.horizonDays)).toEqual(c.expected),
          );
        } else if (v.kind === 'collection-parse') {
          test(c.name, () => expect(parseCollection(text(i))).toEqual(c.expected));
        } else if (v.kind === 'collection-build') {
          test(c.name, () => {
            const out = buildCollection(i.collection as CollectionDocument);
            expect({ text: out }).toEqual(c.expected);
            const back = parseCollection(out);
            expect(back.ok && buildCollection(back.collection)).toBe(out);
          });
        } else if (v.kind === 'collection-plan') {
          test(c.name, () =>
            expect(planCollectionSync(i.local, i.remote, i.options)).toEqual(c.expected),
          );
        } else if (v.kind === 'sealed-parse') {
          test(c.name, () => expect(parseSealed(text(i))).toEqual(c.expected));
        } else if (v.kind === 'sealed-build') {
          test(c.name, () => {
            const out = buildSealed(i.sealed as Sealed);
            expect({ text: out }).toEqual(c.expected);
            expect(parseSealed(out)).toEqual({ ok: true, sealed: JSON.parse(out) });
          });
        } else if (v.kind === 'sealed-aad') {
          test(c.name, () =>
            expect({ aad: sealedAad(i.space, i.collection) ?? null }).toEqual(c.expected),
          );
        } else if (v.kind === 'invite-parse') {
          test(c.name, () => expect(parseInvite(i.value)).toEqual(c.expected));
        } else if (v.kind === 'invite-build') {
          test(c.name, () => {
            const out = buildInvite(i.invite as Invite);
            expect({ text: JSON.stringify(out) }).toEqual(c.expected);
            expect(parseInvite(out)).toEqual({ ok: true, invite: out });
          });
        } else throw new Error(`no runner for kind ${String(v.kind)}`);
      }
    });
  }
});

/** A small seeded generator (mulberry32): the tests must not use Math.random. */
function seeded(seed: number) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return (n: number) => Math.floor(next() * n);
}

const TIMES = [
  '2026-11-18T10:00:00.000Z',
  '2026-11-18T10:00:00Z',
  '2026-11-18T10:00:01.000Z',
  '2026-11-18T10:05:00.000Z',
  '2026-11-18T10:05:00.5Z',
];

function generate(pick: (n: number) => number): Rec[] {
  const out: Rec[] = [];
  for (let n = pick(7); n > 0; n--) {
    const key = ['a', 'b', 'c', 'd'][pick(4)] as string;
    const updatedAt = TIMES[pick(TIMES.length)] as string;
    const kind = pick(10);
    if (kind === 0) out.push({ key, updatedAt: 'bad', value: 1 });
    else if (kind <= 3) out.push({ key, updatedAt, deleted: true });
    else out.push({ key, updatedAt, value: { n: pick(3), m: pick(2) === 0 ? { x: 1 } : [1] } });
  }
  return out;
}

function properties(local: Rec[], remote: Rec[], label: string) {
  const ab = mergeRecords(local, remote);
  const ba = mergeRecords(remote, local);
  expect(ab.records, `${label}: symmetry`).toEqual(ba.records);
  expect(ab.changedLocal, `${label}: sides`).toEqual(ba.changedRemote);
  for (const input of [local, remote]) {
    const again = mergeRecords(ab.records, input);
    expect(again.records, `${label}: idempotence`).toEqual(ab.records);
    expect(again.changedLocal, `${label}: stable`).toEqual([]);
  }
  expect(mergeRecords(ab.records, ab.records).records).toEqual(ab.records);
  for (const r of ab.records) expect(instantMs(r.updatedAt), label).toBeDefined();
}

describe('merge properties', () => {
  test('symmetry and idempotence hold for every merge vector', () => {
    for (const { file, v } of vectors.filter((x) => x.v.kind === 'merge')) {
      for (const c of v.cases as Case[]) {
        properties(
          c.input.local as unknown as Rec[],
          c.input.remote as unknown as Rec[],
          `${file}: ${c.name}`,
        );
      }
    }
  });
  test('symmetry and idempotence hold for generated cases', () => {
    const pick = seeded(20261118);
    for (let n = 0; n < 400; n++) properties(generate(pick), generate(pick), `generated ${n}`);
  });
  test('three-way merge does not depend on the order', () => {
    const pick = seeded(7);
    for (let n = 0; n < 200; n++) {
      const [x, y, z] = [generate(pick), generate(pick), generate(pick)];
      const left = mergeRecords(mergeRecords(x, y).records, z).records;
      const right = mergeRecords(x, mergeRecords(y, z).records).records;
      expect(left, `generated ${n}`).toEqual(right);
    }
  });
});

describe('collection plan properties', () => {
  const now = '2026-11-19T10:02:00.000Z';
  const pick = seeded(31337);
  const synced = [undefined, '2026-11-17T00:00:00.000Z', TIMES[0] as string, TIMES[3] as string];
  const cuts = [undefined, '2026-11-18T09:00:00.000Z', '2026-11-18T10:00:30.000Z'];
  test('after both sides apply a plan, a second cycle has nothing to do', () => {
    for (let n = 0; n < 400; n++) {
      const syncedAt = synced[pick(synced.length)];
      const local: LocalCollectionState = {
        space: 's',
        collection: 'stock',
        records: generate(pick),
        ...(syncedAt === undefined ? {} : { syncedAt }),
      };
      const prunedBefore = cuts[pick(cuts.length)];
      const remote: CollectionDocument = {
        format: 'materia-collection',
        version: 1,
        space: 's',
        collection: 'stock',
        records: generate(pick),
        ...(prunedBefore === undefined ? {} : { prunedBefore }),
      };
      const options = { now, horizonDays: 1 };
      const first = planCollectionSync(local, remote, options);
      if ('error' in first) throw new Error('same collection expected');
      const second = planCollectionSync(first.local, first.write ?? remote, options);
      if ('error' in second) throw new Error('same collection expected');
      expect(second.write, `generated ${n}`).toBeUndefined();
      expect(second.localChanged, `generated ${n}`).toBe(false);
      expect(second.expired, `generated ${n}`).toEqual([]);
      expect(second.pruned, `generated ${n}`).toEqual([]);
    }
  });
});

describe('stamp properties', () => {
  test('the stamp is later than the newest seen and readable again', () => {
    const pick = seeded(5);
    for (let n = 0; n < 300; n++) {
      const now = TIMES[pick(TIMES.length)] as string;
      const latest = TIMES[pick(TIMES.length)] as string;
      const stamp = nextStamp(now, latest) as string;
      expect(instantMs(stamp), `generated ${n}`).toBeGreaterThan(instantMs(latest) as number);
      expect(instantMs(stamp), `generated ${n}`).toBeGreaterThanOrEqual(instantMs(now) as number);
      expect(stamp).toMatch(/\.\d{3}Z$/);
    }
  });
});
