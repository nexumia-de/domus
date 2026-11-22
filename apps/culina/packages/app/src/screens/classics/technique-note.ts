// The note beside a step: what to watch in one or two sentences; why, the level and the sources
// behind a tap; "I know this" marks the skill as learned. The technique note and the handling note
// are built by the same card. The app proposes only.
import type { Lang, Technique, TechniqueLevel, TechniqueSource } from '@culina/engine';
import { pickText } from '@culina/engine';
import { el } from '../../shell/el';
import { appLang } from '../../shared/locale';
import { strings } from '../../strings';
import { citeText } from './cite';

const t = strings.classics;

export interface NoteContent {
  heading: string;
  /** The one or two sentences shown at once. */
  text: string;
  /** A line before the text, for example the amount of a substitute. */
  lead?: string;
  /** Why; the paragraph is left out when there is none. */
  why?: string;
  level: TechniqueLevel;
  sources: readonly TechniqueSource[];
  /** "I know this"; the button is left out when there is none. */
  onKnown?: () => void;
}

/** The card: `kind` names its classes (`<kind>-note`, `<kind>-more`, `<kind>-sources`). */
export const noteCard = (kind: string, content: NoteContent): HTMLElement => {
  const note = el('aside', `${kind}-note note-card`);
  const heading = el('h3', undefined, content.heading);
  const more = el('details', `${kind}-more note-more`);
  more.append(el('summary', undefined, t.noteMore));
  if (content.why !== undefined) more.append(el('p', undefined, content.why));
  more.append(el('h4', undefined, t.noteSources));
  const sources = el('ul', `${kind}-sources note-sources`);
  // A source is kept once per sentence it backs; the reader sees each place once.
  const shown = new Set<string>();
  for (const source of content.sources) {
    const line = t.noteSource(
      t.noteLevel[source.level ?? content.level],
      citeText(source.title, appLang),
      citeText(source.place, appLang),
    );
    const key = `${line}|${source.url ?? ''}|${source.isbn ?? ''}`;
    if (shown.has(key)) continue;
    shown.add(key);
    const item = el('li');
    if (source.url === undefined) {
      // A printed book: nothing to link to, the ISBN names the edition.
      item.append(source.isbn === undefined ? line : t.noteSourceBook(line, source.isbn));
    } else {
      const link = el('a', undefined, line);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      item.append(link);
    }
    sources.append(item);
  }
  more.append(sources);
  note.append(heading);
  if (content.lead !== undefined) note.append(el('p', 'note-lead', content.lead));
  note.append(el('p', undefined, content.text), more);
  if (content.onKnown !== undefined) {
    const known = el('button', 'btn quiet', t.iKnowThis);
    known.type = 'button';
    known.addEventListener('click', content.onKnown);
    note.append(known);
  }
  return note;
};

export const techniqueNote = (
  technique: Technique,
  lang: Lang,
  onKnown: () => void,
): HTMLElement => {
  const note = noteCard('technique', {
    heading: t.noteHeading(pickText(technique.name, lang)),
    text: pickText(technique.watch, lang),
    why: pickText(technique.why, lang),
    level: technique.level,
    sources: technique.sources,
    onKnown,
  });
  note.dataset.technique = technique.id;
  return note;
};
