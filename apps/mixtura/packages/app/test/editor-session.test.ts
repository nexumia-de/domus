import { afterEach, describe, expect, test } from 'vitest';
import { blankDraft, withTemplate } from '../src/screens/editor/draft';
import { dropSession, newDrinkKey, sessionFor } from '../src/screens/editor/session';
import { ROOT_TEMPLATES } from '@mixtura/engine';
import type { Template } from '../src/screens/browse/types';

const martini = ROOT_TEMPLATES.find((t) => t.id === 'martini') as unknown as Template;
const fromTemplate = () => withTemplate(blankDraft(), martini, () => undefined);

let open: ReturnType<typeof sessionFor> | undefined;
afterEach(() => {
  if (open) dropSession(open);
  open = undefined;
});

describe('the session of a new drink', () => {
  test('a blank start and each template have their own key', () => {
    expect(newDrinkKey()).toBe('new');
    expect(newDrinkKey('martini')).toBe('new?template=martini');
    expect(newDrinkKey('martini')).not.toBe(newDrinkKey('daiquiri'));
  });

  test('New Drink from a template after a blank one starts with the template slots', () => {
    const blank = sessionFor(
      newDrinkKey(),
      () => blankDraft(),
      null,
      () => undefined,
    );
    expect(blank.draft.lines).toHaveLength(0);
    open = sessionFor(newDrinkKey('martini'), fromTemplate, null, () => undefined);
    expect(open.draft.lines.length).toBeGreaterThan(0);
    expect(open).not.toBe(blank);
  });

  test('the same start comes back as the same session', () => {
    open = sessionFor(newDrinkKey('martini'), fromTemplate, null, () => undefined);
    const again = sessionFor(newDrinkKey('martini'), fromTemplate, null, () => undefined);
    expect(again).toBe(open);
  });
});
