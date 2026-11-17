// Mixtura's parent corrections of the ingredient tree (data/mixtura/corrections.json):
// each names an ingredient and the source parent it replaces, carries a note and its
// evidence, and the corrected tree is valid and puts nothing under a type it does not belong to.
import { describe, expect, test } from 'vitest';
import { applyCorrections } from '../../app/seed-corrections.mjs';
import { ancestors, buildTree, isA, type Ingredient } from '../src/index';
import { engineRoot, read, seed } from './seed-data';

interface Correction {
  id: string;
  was: string;
  parentId: string;
  note: string;
  evidence: { status: string; source: string };
}
const { corrections } = read<{ corrections: Correction[] }>(
  `${engineRoot}data/mixtura/corrections.json`,
);
const base = seed.ingredients.ingredients;
const corrected = applyCorrections(base as { id: string }[], corrections) as Ingredient[];
const built = buildTree(corrected);

describe('corrections', () => {
  test('the list is short', () => expect(corrections.length).toBeLessThanOrEqual(5));

  test.each(corrections)('$id: replaces the source parent, with note and evidence', (c) => {
    expect(base.find((i) => i.id === c.id)?.parentId).toBe(c.was);
    expect(base.some((i) => i.id === c.parentId)).toBe(true);
    expect(c.note.length).toBeGreaterThan(20);
    expect(c.evidence.status).toMatch(/^(assumption, unverified|verified|secondary)/);
    expect(c.evidence.source.length).toBeGreaterThan(10);
  });

  test('the corrected tree is valid', () => expect(built.ok).toBe(true));

  test('every other parent link is the source parent link of the seed', () => {
    const ids = new Set(corrections.map((c) => c.id));
    for (const i of corrected) {
      if (!ids.has(i.id)) expect(i.parentId).toBe(base.find((b) => b.id === i.id)?.parentId);
    }
  });

  test('an aperitif wine is no dry vermouth and tequila is no mezcal', () => {
    if (!built.ok) throw new Error('tree');
    expect(isA(built.tree, 'cocchi-aperitivo-americano', 'dry-vermouth')).toBe(false);
    expect(isA(built.tree, 'cocchi-aperitivo-americano', 'fortified-wine')).toBe(true);
    expect(isA(built.tree, 'tequila-blanco', 'mezcal')).toBe(false);
    expect(ancestors(built.tree, 'tequila-blanco')).toEqual(['tequila', 'spirits']);
  });
});
