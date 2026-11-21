// One entry of the finder as text: the status, the reason it is ranked where it is, what it lacks,
// what would stand in, and where an amount is not known. Everything is read from the engine's
// candidate; the words come from the strings. Pure: names and offers come in.
import type { MakeableCandidate, MakeableLineReport } from '@culina/engine';
import { roleInvite, roleLabel } from '../components/names';
import { hashFor } from '../router';
import { strings } from '../strings';
import type { Lookup } from './lookup';
import { writtenAmount } from '../shared/units';

const t = strings.cook;

export interface CookRow {
  /** `kind:id`, stable; the screens put it on the entry. */
  key: string;
  kind: MakeableCandidate['kind'];
  id: string;
  name: string;
  href: string;
  complete: boolean;
  lacking: number;
  /** "complete" or "lacks 1". */
  status: string;
  /** Why it is where it is: the urgency's item and the roles covered. */
  reason: string;
  /** The lines that are lacking, named. */
  lacks: string[];
  /** "with salted butter in place of butter". */
  substitutions: string[];
  /** Items that are there with no known amount. */
  unknown: string[];
  /** "You could add a crunch: toasted nuts" for the roles of a dish with nothing in stock. */
  offers: string[];
}

export const keyOf = (c: { kind: string; id: string }): string => `${c.kind}:${c.id}`;

/** Where an entry opens: a component, a dish or a ratio card. */
export const hrefOf = (c: { kind: MakeableCandidate['kind']; id: string }): string =>
  hashFor(c.kind === 'component' ? 'components' : c.kind === 'dish' ? 'dishes' : 'ratios', c.id);

/** The remaining days in plain words, from the engine's `daysLeft`. */
export const daysText = (daysLeft: number): string =>
  daysLeft < 0 ? t.pastUseBy : daysLeft === 0 ? t.useByToday : t.daysLeft(daysLeft);

const amountText = (a: { value: number; unit: string }): string => writtenAmount(a);

/** What a line is called: its ingredient or component, else the role of a template. */
const lineName = (look: Lookup, line: MakeableLineReport): string =>
  line.ref !== undefined ? look.name(line.ref) : roleLabel(line.role ?? '').toLowerCase();

const lacksText = (look: Lookup, line: MakeableLineReport): string => {
  const name = lineName(look, line);
  if (line.status === 'short' && line.have !== undefined && line.need !== undefined) {
    return t.lacksShort(name, amountText(line.have), amountText(line.need));
  }
  return line.stateMismatch !== undefined && line.stateMismatch.length > 0
    ? t.lacksOtherState(name)
    : name;
};

/** The lines of a candidate, and the lines of the sub-components that were made from stock. */
const walk = (lines: readonly MakeableLineReport[]): MakeableLineReport[] =>
  lines.flatMap((l) => [l, ...(l.source === 'made' && l.parts ? walk(l.parts) : [])]);

const reasonOf = (c: MakeableCandidate, look: Lookup): string => {
  const itemRef = c.urgency === undefined ? undefined : look.itemRef(c.urgency.itemId);
  const first =
    c.urgency === undefined
      ? t.reasonNoDate
      : t.reasonUses(
          itemRef === undefined ? c.urgency.itemId : look.name(itemRef),
          c.urgency.daysLeft,
        );
  const second =
    c.roles.length === 0
      ? t.reasonNoRoles
      : t.reasonRoles(c.roles.map((r) => roleLabel(r).toLowerCase()).join(', '));
  return `${first}; ${second}`;
};

/**
 * @param candidate - The engine's candidate.
 * @param look - Names of ingredients, components and stock items.
 * @param offers - The names in stock that have a role, for a role of a dish that has no slot.
 */
export const cookRow = (
  candidate: MakeableCandidate,
  look: Lookup,
  offers: (role: string) => string[],
): CookRow => {
  const required = candidate.lines.filter((l) => !l.optional);
  const all = walk(candidate.lines);
  return {
    key: keyOf(candidate),
    kind: candidate.kind,
    id: candidate.id,
    name: candidate.name,
    href: hrefOf(candidate),
    complete: candidate.complete,
    lacking: candidate.lacking,
    status: candidate.complete ? t.complete : t.lacks(candidate.lacking),
    reason: reasonOf(candidate, look),
    lacks: required
      .filter((l) => l.status === 'missing' || l.status === 'short')
      .map((l) => lacksText(look, l)),
    substitutions: candidate.substitutions.map((s) =>
      t.substitution(
        look.name({ kind: 'ingredient', id: s.substitute }),
        look.name({ kind: 'ingredient', id: s.asked }),
      ),
    ),
    unknown: all
      .filter((l) => l.status === 'have-amount-unknown')
      .map((l) => t.amountUnknown(lineName(look, l))),
    offers: (candidate.openRoles ?? []).flatMap((role) => {
      const names = offers(role);
      return names.length === 0 ? [] : [t.offer(roleInvite(role), names.join(', '))];
    }),
  };
};
