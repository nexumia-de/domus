// Components by family, for the cycle checks: a reference to any version of a component names
// its family, and a family's lines are those of its head.
import type { ComponentLine } from '@culina/engine';
import { getComponent } from './read';
import { headsOf } from './versions';

/** The lines with every component reference replaced by the id of its family. */
export const canonicalLines = <L extends { ref: ComponentLine['ref'] }>(lines: readonly L[]): L[] =>
  lines.map((line) =>
    line.ref.kind === 'component'
      ? {
          ...line,
          ref: {
            kind: 'component' as const,
            id: getComponent(line.ref.id)?.version.family ?? line.ref.id,
          },
        }
      : line,
  );

/** One entry per family, id = the family, lines of its head. */
export const familyView = (): { id: string; lines: ComponentLine[] }[] =>
  headsOf('components').map((head) => ({
    id: head.version.family,
    lines: canonicalLines(head.lines),
  }));
