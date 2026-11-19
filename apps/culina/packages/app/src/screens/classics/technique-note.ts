// The note of a technique beside a step: what to watch in one or two sentences; why, the level
// and the sources behind a tap; "I know this" marks the skill as learned. The app proposes only.
import type { Lang, Technique } from '@culina/engine';
import { pickText } from '@culina/engine';
import { el } from '../../shell/el';
import { strings } from '../../strings';

const t = strings.classics;

export const techniqueNote = (
  technique: Technique,
  lang: Lang,
  onKnown: () => void,
): HTMLElement => {
  const note = el('aside', 'technique-note');
  note.dataset.technique = technique.id;
  const heading = el('h3', undefined, t.noteHeading(pickText(technique.name, lang)));
  const more = el('details', 'technique-more');
  more.append(
    el('summary', undefined, t.noteMore),
    el('p', undefined, pickText(technique.why, lang)),
  );
  more.append(el('p', 'muted', t.noteLevel[technique.level]), el('h4', undefined, t.noteSources));
  const sources = el('ul', 'technique-sources');
  for (const source of technique.sources) {
    const item = el('li');
    const link = el('a', undefined, t.noteSource(source.title, source.place));
    link.href = source.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    item.append(link);
    sources.append(item);
  }
  more.append(sources);
  const known = el('button', 'btn quiet', t.iKnowThis);
  known.type = 'button';
  known.addEventListener('click', onKnown);
  note.append(heading, el('p', undefined, pickText(technique.watch, lang)), more, known);
  return note;
};
