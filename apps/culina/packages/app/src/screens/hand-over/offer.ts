// The offer on a shipped dish's page (roadmap goal 11): under the ingredients, one quiet line
// that says how many ingredients the stock lacks for the dish as chosen (filling, portions) and a
// button that opens the confirmation. Nothing when nothing lacks, when the shared database is not
// there, when the stock holds no item at all (every dish would lack everything: noise, not help),
// or before the catalogue is loaded. What this page put on the list is counted ("…; 4 of them on
// the shopping list"), and when all of it is there the line says so and offers nothing; the list
// itself is not read for it (a hand-over on an earlier visit says "already" when it is made).
//
// The confirmation, the write and the message after it are in ./confirm.ts, built as
// `hand-over.js` and loaded when the cook first opens it: it carries the list package's rules and
// usual items, which main.js does not (test/build.test.ts). A module that does not load, or comes
// from another build than this main.js (the service worker updated the app while the page was
// open), is said in a status line; the button stays.
import type { Classic, Lang } from '@culina/engine';
import { asChosen, choiceKey } from '../../classics/choices';
import { catalogueEntries } from '../../classics/names';
import { cookToday, notebookSource } from '../../cook/source';
import { listStatus, listStock, listWriter, stockSpaces } from '../../notebook';
import { listAmountText } from '../../shared-list/lines';
import {
  classicLack,
  lackingAmounts,
  lineName,
  shippedDishKey,
  type ClassicLinesInput,
} from '../../shared-list/report';
import { offerText } from '../../shared-list/words';
import { el } from '../../shell/el';
import { strings } from '../../strings';
import type { HandOverEnv, HandOverLack } from './confirm';
import { focusAfterDraw, handOverSession } from './session';

const w = strings.handOver;

declare const __BUILD_ID__: string | undefined;
/** The build of this main.js (build.mjs); 'dev' outside a build. */
const BUILD: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

type Chunk = typeof import('./confirm');
/** Next to main.js; a variable, so that the bundler leaves the import to the browser. */
const CHUNK_URL = './hand-over.js';
let chunk: Chunk | undefined;
let loading: Promise<Chunk> | undefined;

/** Why the confirmation cannot be opened: it did not load, or it is of another build. */
class ChunkProblem extends Error {
  constructor(readonly text: string) {
    super(text);
  }
}

const loadChunk = (): Promise<Chunk> => {
  loading ??= (import(CHUNK_URL) as Promise<Chunk>).then(
    (m) => {
      if (m.BUILD !== BUILD) throw new ChunkProblem(w.updated);
      chunk = m;
      return m;
    },
    () => {
      throw new ChunkProblem(w.loadProblem);
    },
  );
  // A failed load is tried again on the next tap (a module of another build is not).
  loading.catch((e: unknown) => {
    if (!(e instanceof ChunkProblem) || e.text !== w.updated) loading = undefined;
  });
  return loading;
};

const env: HandOverEnv = { w, writer: listWriter, spaces: stockSpaces, listStatus };

/** The dish as the page shows it, for the finder's report; undefined when it cannot be judged. */
const inputOf = (classic: Classic, portions: number, lang: Lang): ClassicLinesInput | undefined => {
  const catalogue = catalogueEntries();
  if (catalogue.size === 0) return undefined;
  return {
    classic: asChosen(classic),
    portions,
    lang,
    source: notebookSource(),
    catalogue,
    today: cookToday(),
    choice: choiceKey(classic.id),
  };
};

/** What the dish lacks as the confirmation writes it. */
const lackOf = (input: ClassicLinesInput): HandOverLack | undefined => {
  const found = classicLack(input);
  if (found === undefined) return undefined;
  return {
    report: found.report,
    nameOf: lineName(found.byId, input.lang),
    amountText: (amount, measure) => listAmountText(amount, input.lang, measure),
    title: found.report.name,
    dish: shippedDishKey(input.classic.id, input.choice),
  };
};

/**
 * The offer and, once opened, the confirmation and the message after a hand-over, for a shipped
 * dish at the portions shown; empty when there is nothing to offer or say.
 * @param redraw - Draws this dish page again (its ingredients, this offer).
 */
export const handOverOffer = (
  classic: Classic,
  portions: number,
  lang: Lang,
  redraw: () => void,
): HTMLElement[] => {
  if (listWriter() === undefined) return [];
  const session = handOverSession(classic.id);
  // The notebook draws the whole screen again on every change, the write included, so a draw
  // asked for later (after the write, after Undo) goes to the page drawn last.
  session.draw = redraw;
  const again = (): void => session.draw?.();
  const input = listStock().length === 0 ? undefined : inputOf(classic, portions, lang);
  // Handed over by this page with the amount needed now; at other portions or with another
  // filling a line differs, and the offer keeps its button.
  const lacking =
    input === undefined
      ? undefined
      : lackingAmounts(input, (amount, measure) => listAmountText(amount, lang, measure));
  const settled = lacking?.filter(
    (l) => session.handed.has(l.id) && session.handedAt.get(l.id) === l.amount,
  );
  const offer = offerText(lacking?.length, w, settled?.length);
  if (offer === undefined || !offer.button) session.open = false;
  const box = el('div', 'handover');
  if (offer !== undefined) {
    const line = el('p', 'note-quiet handover-offer');
    line.append(el('span', 'handover-count', offer.text));
    if (offer.button) {
      const open = el('button', 'btn quiet handover-open', w.offerButton);
      open.type = 'button';
      open.dataset['ho'] = 'offer';
      open.setAttribute('aria-expanded', String(session.open));
      if (session.open) open.setAttribute('aria-controls', 'handover-confirm');
      open.addEventListener('click', () => {
        if (session.open) return;
        loadChunk().then(
          () => {
            session.problem = undefined;
            session.open = true;
            session.focus = 'first';
            again();
          },
          (e: unknown) => {
            session.problem = e instanceof ChunkProblem ? e.text : w.loadProblem;
            again();
          },
        );
      });
      line.append(open);
    }
    box.append(line);
  }
  if (session.problem !== undefined) {
    const problem = el('p', 'note-quiet handover-problem', session.problem);
    problem.setAttribute('role', 'status');
    box.append(problem);
  }
  if (chunk !== undefined) {
    const lack = session.open && input !== undefined ? lackOf(input) : undefined;
    box.append(
      ...chunk.handOverParts({
        env,
        session,
        redraw: again,
        ...(lack === undefined ? {} : { lack }),
      }),
    );
  }
  if (box.childElementCount === 0) return [];
  focusAfterDraw(box, session);
  return [box];
};
