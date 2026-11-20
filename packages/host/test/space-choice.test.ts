// Which space an app shows, and the view of a space a screen needs.
import { describe, expect, test } from 'vitest';
import { pickSpace, viewOf, type SpaceView } from '../src/space-choice';

const home: SpaceView = { id: 'home', name: 'Home', deviceOnly: true };
const house: SpaceView = { id: 'house', name: 'Household', deviceOnly: false };
const parents: SpaceView = { id: 'parents', name: 'Parents', deviceOnly: false };

describe('the shown space', () => {
  const counts = (c: Record<string, number>) => new Map(Object.entries(c));

  test('the choice wins while its space is there', () => {
    expect(pickSpace([home, house], 'home', counts({ house: 3 }))).toBe(home);
    expect(pickSpace([home, house], 'gone', counts({}))).toBe(house);
  });

  test('without a choice a shared space is shown before an empty one on this device', () => {
    expect(pickSpace([home, house], null, counts({}))).toBe(house);
    expect(pickSpace([home, house, parents], null, counts({ parents: 2 }))).toBe(parents);
    expect(pickSpace([home, house], null, counts({ home: 1, house: 1 }))).toBe(house);
  });

  test('a list begun on this device is not hidden behind an empty shared space', () => {
    expect(pickSpace([home, house], null, counts({ home: 4 }))).toBe(home);
  });

  test('one space, or none', () => {
    expect(pickSpace([home], null, counts({}))).toBe(home);
    expect(pickSpace([], null, counts({}))).toBeUndefined();
  });

  test('a space without a name gets the word for it', () => {
    const stored = { id: 'a', secret: 's', name: '  ', storage: { type: 'device', address: '' } };
    expect(viewOf(stored, 'Unnamed')).toEqual({ id: 'a', name: 'Unnamed', deviceOnly: true });
  });
});
