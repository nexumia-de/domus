import { describe, expect, test } from 'vitest';
import { readAmount, storedText, withUnit } from '../src/screens/editor/amount-entry';

const ok = (text: string, unit = '') => {
  const read = readAmount(text, unit);
  if (!read.ok) throw new Error(read.message);
  return read;
};

describe('reading an amount as typed', () => {
  test('the grammar of docs/units.md', () => {
    expect(ok('45 ml')).toMatchObject({ amount: 45, unit: 'ml', hint: '= 45 ml' });
    expect(ok('3/4 oz')).toMatchObject({ amount: 0.75, unit: 'oz_us', hint: '= 22.5 ml' });
    expect(ok('1½ oz')).toMatchObject({ amount: 1.5, unit: 'oz_us' });
    expect(ok('1 1/2 oz')).toMatchObject({ amount: 1.5 });
    expect(ok('45ml')).toMatchObject({ amount: 45, unit: 'ml' });
    expect(ok('2 dashes')).toMatchObject({ amount: 2, unit: 'dash' });
    expect(ok('a splash')).toMatchObject({ amount: 1, unit: 'splash' });
    expect(ok('1 whole')).toMatchObject({ amount: 1, unit: 'whole' });
    expect(ok('22,5 ml')).toMatchObject({ amount: 22.5 });
  });

  test('a convention unit is said to be about', () => {
    expect(ok('2 dashes').hint.startsWith('= about')).toBe(true);
  });

  test('a counted unit has no volume of its own', () => {
    expect(ok('1 whole').hint).toContain('counted');
  });

  test('a ranges gives amountMax', () => {
    expect(ok('1-2 dashes')).toMatchObject({ amount: 1, amountMax: 2, unit: 'dash' });
    expect(ok('1–2 dashes')).toMatchObject({ amount: 1, amountMax: 2 });
    expect(readAmount('2-1 dashes', '').ok).toBe(false);
  });

  test('a bare number takes the selector unit, or is refused', () => {
    expect(ok('60', 'ml')).toMatchObject({ amount: 60, unit: 'ml' });
    const none = readAmount('60', '');
    expect(none.ok).toBe(false);
    if (!none.ok) expect(none.message).toContain('unit');
  });

  test('a unit in the text wins over the selector', () => {
    expect(ok('1 oz', 'ml')).toMatchObject({ unit: 'oz_us' });
  });

  test('the ounce follows the stored line or the setting', () => {
    const read = readAmount('1 oz', '', 'imperial');
    expect(read.ok && read.unit).toBe('oz_imp');
  });

  test('refused with a reason: empty, zero, negative, words, absurd', () => {
    for (const text of ['', '0 ml', '-5 ml', 'lots', '99999 ml', '1 parsec']) {
      const read = readAmount(text, 'ml');
      expect(read.ok, text).toBe(false);
      if (!read.ok) expect(read.message.length).toBeGreaterThan(5);
    }
  });
});

describe('the unit selector and stored amounts', () => {
  test('stored amounts read back in their own unit', () => {
    expect(storedText({ amount: 22.5, unit: 'ml' })).toBe('22.5 ml');
    expect(storedText({ amount: 0.75, unit: 'oz_us' })).toBe('0.75 oz');
    expect(storedText({ amount: 1, amountMax: 2, unit: 'dash' })).toBe('1–2 dash');
    expect(storedText({ amount: 1, unit: 'top' })).toBe('');
    for (const text of ['22.5 ml', '0.75 oz', '1–2 dash']) expect(ok(text).ok).toBe(true);
  });

  test('changing the unit keeps the number', () => {
    expect(withUnit('3/4 oz', 'ml')).toBe('3/4 ml');
    expect(withUnit('60', 'cl')).toBe('60 cl');
    expect(withUnit('', 'cl')).toBe('');
  });
});
