import { describe, expect, test } from 'vitest';
import {
  initialSpecView,
  openTopField,
  parseTopVolume,
  setTopMl,
  viewFor,
} from '../src/screens/spec/session';

describe('what-if volume text', () => {
  test.each([
    ['90', 90],
    ['90,5', 90.5],
    [' 90 ml ', 90],
    ['9 cl', 90],
    ['3 oz', 88.7205886875],
  ])('%s is %s ml', (text, ml) => {
    const v = parseTopVolume(text);
    expect(v.ok && Math.abs(v.ml - ml) < 1e-6).toBe(true);
  });
  test.each(['', 'abc', '0', '-5', '2 g', '1 whole', '2001', '5 dashes x'])(
    '%s is refused',
    (t) => {
      expect(parseTopVolume(t).ok).toBe(false);
    },
  );
});

describe('the state belongs to one drink', () => {
  test('set, edit and clear', () => {
    let v = openTopField(initialSpecView, 'a', 2);
    expect(v).toMatchObject({ lineage: 'a', editingTop: 2 });
    v = setTopMl(v, 'a', 2, 90);
    expect(v).toMatchObject({ topMl: { 2: 90 }, editingTop: null });
    expect(setTopMl(v, 'a', 2, null).topMl).toEqual({});
  });
  test('another drink starts from the defaults', () => {
    const v = setTopMl(initialSpecView, 'a', 1, 60);
    expect(viewFor(v, 'b')).toEqual({ ...initialSpecView, lineage: 'b' });
    expect(setTopMl(v, 'b', 0, 30).topMl).toEqual({ 0: 30 });
  });
});
