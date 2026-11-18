// What Save does with the version fields: a new record is version 1 of its own family, an
// existing one is never written again - Save adds a new record, same family, parent the
// version that was edited. `today` is `YYYY-MM-DD` from the injected clock.
import type { VersionInfo } from '../records';

/** The optional fields next to Save, as typed (part of the form, so also of the draft). */
export interface VersionNote {
  change?: string;
  reason?: string;
  tasting?: string;
}

const texts = (note: VersionNote): Pick<VersionInfo, 'change' | 'reason'> => ({
  ...(note.change?.trim() ? { change: note.change.trim() } : {}),
  ...(note.reason?.trim() ? { reason: note.reason.trim() } : {}),
});

/**
 * The record to store for a form. `built.version` is the version being edited for a stored
 * record, or a fresh family for a new one.
 */
export const asNextVersion = <R extends { id: string; version: VersionInfo }>(
  built: R,
  isNew: boolean,
  note: VersionNote,
  newId: string,
  today: string,
): R =>
  isNew
    ? { ...built, version: { family: built.id, date: today, ...texts(note) } }
    : {
        ...built,
        id: newId,
        version: {
          family: built.version.family,
          parent: built.id,
          date: today,
          ...texts(note),
        },
      };

/** The tasting text to store, or undefined when none was typed. */
export const tastingText = (note: VersionNote): string | undefined =>
  note.tasting?.trim() ? note.tasting.trim() : undefined;
