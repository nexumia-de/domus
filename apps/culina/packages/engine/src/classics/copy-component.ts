// The copy of one component of a shipped file into the notebook: the component with the components
// its lines name, as version 1 of a new family each. It is `copyClassic` on the file narrowed to
// those components and without slots, so the rules of a copy (amounts, notes, origin) are the same.
// Pure: ids and the date come in as input.
import { componentsReached } from './base';
import { copyClassic } from './copy';
import type { CopiedComponent, CopyOptions, CopyResult } from './copy';
import type { Classic } from './types';

export type CopyComponentResult =
  | {
      ok: true;
      /** The component asked for first, then the components its lines name, in file order. */
      components: CopiedComponent[];
    }
  | {
      ok: false;
      error:
        Extract<CopyResult, { ok: false }>['error'] | { code: 'unknown-component'; id: string };
    };

/**
 * Copies one component of a classic or base, with every component its lines name (all the way
 * down), as version 1 of a new family per record, with the file's origin. Amounts are for
 * `portions` of the whole file, as `copyClassic` gives them. A `wanted` line in the component or
 * in one it names refuses the copy; a `wanted` line elsewhere in the file does not.
 *
 * @param classic - A classic or base that passed `validateClassic`.
 * @param componentId - The id of the component in the file.
 * @param options - Portions, language, the day and the id source (one id per component copied,
 *   and one more that the dish `copyClassic` builds alongside takes and that is dropped).
 * @returns The component records, the errors of `copyClassic`, or `unknown-component`.
 */
export function copyClassicComponent(
  classic: Classic,
  componentId: string,
  options: CopyOptions,
): CopyComponentResult {
  const all = classic.components ?? [];
  const asked = all.find((c) => c.id === componentId);
  if (asked === undefined)
    return { ok: false, error: { code: 'unknown-component', id: componentId } };
  const reached = componentsReached(classic, [componentId]);
  const others = all.filter((c) => c.id !== componentId && reached.has(c.id));
  const narrowed: Classic = { ...classic, components: [asked, ...others], slots: [] };
  const copied = copyClassic(narrowed, options);
  return copied.ok ? { ok: true, components: copied.components } : copied;
}
