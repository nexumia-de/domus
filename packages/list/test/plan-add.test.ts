// `planAdd` and `planAdds`: what putting something on the list writes, on records given as the
// shared database would hand them. What this does not prove: no store and no transaction run here
// (the apps' tests run the plans inside the host package's `localChange`); ids and the clock are
// injected counters.
import { describe, expect, it } from 'vitest';
import { entriesOf, isEntryValue, planAdd, planAdds, type StoredRecord } from '../src/index';

const deps = () => {
  let id = 0;
  let second = 0;
  return {
    newId: () => `n${++id}`,
    now: () => `2026-11-24T10:00:${String(++second).padStart(2, '0')}.000Z`,
  };
};

const record = (key: string, value: unknown, deleted = false): StoredRecord =>
  deleted
    ? { key, updatedAt: '2026-11-20T08:00:00.000Z', deleted: true }
    : { key, updatedAt: '2026-11-20T08:00:00.000Z', value };

const butter = {
  name: 'Butter',
  ingredientId: 'fdc-173410',
  categoryId: 'dairy',
  priority: 'sometime',
  amount: '250 g',
  addedAt: '2026-11-20T08:00:00.000Z',
  origins: [{ kind: 'typed' }],
};

describe('planAdd', () => {
  it('makes a typed entry at the default priority when nothing is given', () => {
    const plan = planAdd([], { name: '  Oat   milk ' }, deps());
    expect(plan).toEqual({
      id: 'n1',
      joined: false,
      put: {
        key: 'n1',
        value: {
          name: 'Oat milk',
          categoryId: 'dairy',
          priority: 'soon',
          addedAt: '2026-11-24T10:00:01.000Z',
          origins: [{ kind: 'typed' }],
        },
      },
      entry: expect.objectContaining({ id: 'n1', name: 'Oat milk' }),
    });
  });

  it('gives null for an empty name', () => {
    expect(planAdd([], { name: '   ' }, deps())).toBeNull();
  });

  it('with an ingredient id and no catalogue match, the category is other (as Emptio passes it)', () => {
    expect(planAdd([], { name: 'Butter', ingredientId: 'fdc-1' }, deps())?.entry.categoryId).toBe(
      'other',
    );
  });

  it('takes a given catalogue match for rule 4, step 2', () => {
    const plan = planAdd(
      [],
      {
        name: 'Butter',
        ingredientId: 'fdc-1',
        catalogue: { ingredientId: 'fdc-1', categoryId: 'x' },
      },
      deps(),
    );
    expect(plan?.entry.categoryId).toBe('x');
  });

  it('joins an open entry of the same ingredient, keeps its id and the fields of another app', () => {
    const records = [record('e1', { ...butter, fromOtherApp: 7 })];
    const plan = planAdd(
      records,
      {
        name: 'Butter, salted',
        ingredientId: 'fdc-173410',
        amount: '50 g',
        priority: 'now',
        origins: [{ kind: 'recipe', app: 'culina', title: 'Shortbread' }],
      },
      deps(),
    );
    expect(plan?.joined).toBe(true);
    expect(plan?.put).toEqual({
      key: 'e1',
      value: {
        ...butter,
        fromOtherApp: 7,
        priority: 'now',
        amount: '250 g + 50 g',
        origins: [{ kind: 'typed' }, { kind: 'recipe', app: 'culina', title: 'Shortbread' }],
      },
    });
  });

  it('does not join a bought entry, a removed one or a record that is no entry', () => {
    const records = [
      record('e1', { ...butter, bought: { at: '2026-11-21T08:00:00.000Z' } }),
      record('e2', undefined, true),
      record('e3', { name: 'Butter', ingredientId: 'fdc-173410' }),
    ];
    const plan = planAdd(records, { name: 'Butter', ingredientId: 'fdc-173410' }, deps());
    expect(plan?.joined).toBe(false);
    expect(plan?.id).toBe('n1');
    // The household's category of the bought entry is kept for the new one (rule 4, step 1).
    expect(plan?.entry.categoryId).toBe('dairy');
  });

  it('writes a value that is an entry of the data model', () => {
    const plan = planAdd([], { name: 'Eggs', amount: '6', note: ' free range ' }, deps());
    expect(isEntryValue(plan?.put.value)).toBe(true);
    expect(plan?.put.value).toMatchObject({ amount: '6', note: 'free range' });
  });
});

describe('planAdds', () => {
  it('two lines of one thing make one entry with both amounts', () => {
    const { put, plans } = planAdds(
      [],
      [
        { name: 'Butter', ingredientId: 'fdc-1', amount: '50 g' },
        { name: 'Butter', ingredientId: 'fdc-1', amount: '2 tbsp' },
        { name: 'Flour', ingredientId: 'fdc-2' },
      ],
      deps(),
    );
    expect(put.map((p) => p.key)).toEqual(['n1', 'n3']);
    expect(put[0]?.value['amount']).toBe('50 g + 2 tbsp');
    expect(plans.map((p) => p?.joined)).toEqual([false, true, false]);
  });

  it('joins in place: the first of two open entries of one thing stays the one that is raised', () => {
    const records = [record('a', { ...butter }), record('b', { ...butter, amount: '1 kg' })];
    const { put } = planAdds(
      records,
      [
        { name: 'Butter', ingredientId: 'fdc-173410', amount: '10 g' },
        { name: 'Butter', ingredientId: 'fdc-173410', amount: '20 g' },
      ],
      deps(),
    );
    expect(put).toHaveLength(1);
    expect(put[0]?.key).toBe('a');
    expect(put[0]?.value['amount']).toBe('250 g + 10 g + 20 g');
  });

  it('leaves out an empty name and writes the rest', () => {
    const { put, plans } = planAdds([], [{ name: ' ' }, { name: 'Salt' }], deps());
    expect(plans[0]).toBeNull();
    expect(entriesOf(put.map((p) => record(p.key, p.value))).map((e) => e.name)).toEqual(['Salt']);
  });
});
