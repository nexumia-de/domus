// The note of a handling rule beside a step: the rule in one or two sentences; why, the level and
// the sources behind a tap; "I know this" marks the technique the rule belongs to as learned. Built
// by the same card as the technique note.
import type { Lang } from '@culina/engine';
import { pickText } from '@culina/engine';
import type { HandlingNote } from '../../classics/handling-view';
import { strings } from '../../strings';
import { noteCard } from './technique-note';

const t = strings.classics;

export const handlingNote = (note: HandlingNote, lang: Lang, onKnown: () => void): HTMLElement => {
  const card = noteCard('handling', {
    heading: t.handlingHeading(note.name),
    text: pickText(note.rule.text, lang),
    why: pickText(note.rule.why, lang),
    level: note.rule.level,
    sources: note.rule.sources,
    onKnown,
  });
  card.dataset.rule = note.rule.id;
  card.dataset.technique = note.rule.technique;
  return card;
};
