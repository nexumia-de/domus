// The confirmation of a hand-over and the message after it, on a shipped dish's page (roadmap
// goal 11). Built as a module of its own (`hand-over.js`, build.mjs), loaded by main.js when the
// cook first opens the confirmation (./offer.ts): it carries the list package's rules and usual
// items, which main.js does not. It shares no module state with main.js, so it imports only pure
// code (the list rules, the hand-over's write, the words) and takes the running app as `env`.
// `BUILD` is the build both files come from; main.js refuses a module of another build (the
// service worker can hand an updated file to a page that is still open).
//
// The confirmation is an inline section under the offer, as the dish page opens its other choices
// (Swap, the closed sections): the lacking lines with their amounts as they will be written,
// ticked unless this page put them on the list already; the names the catalogue lacks unticked;
// the space, when the household has more than one; a word when the list could not be synced
// lately; one button. Escape and Cancel close it and give the focus back to the offer. After the
// write the message says what happened, in a status line of the page, with the amounts that
// differ in a plain list after it, Undo and the way to the shopping list (Emptio, `../emptio/`,
// in a new tab, so that the recipe and its Undo stay where they are). Undo takes back every
// hand-over of this page that wrote something, the last first; one that wrote nothing changes
// nothing of it.
import { freeLines, lackingLines } from '@culina/engine';
import type { Amount, HouseholdMeasure, LackingReport } from '@culina/engine';
import type { SpaceView, SyncStatus } from '@nexumia-de/hospes';
import {
  finalOutcome,
  handOver,
  undoHandOver,
  type UndoOutcome,
} from '../../shared-list/hand-over';
import type { StockSpace } from '../../shared-stock/space';
import { handOverSaid, undoSaid, writtenNames } from '../../shared-list/words';
import { el } from '../../shell/el';
import type { handOverStrings } from '../../strings-handover';
import type { HandOverSession } from './session';

declare const __BUILD_ID__: string | undefined;
/** The build this module comes from (build.mjs); 'dev' outside a build. */
export const BUILD: string = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';

/** Where the shopping list is on the one address: the folder next to this app's. */
export const EMPTIO_HREF = '../emptio/';

/** What the dish lacks, as main.js read it: the finder's report and how to write its lines. */
export interface HandOverLack {
  report: LackingReport;
  nameOf: (ref: { kind: string; id: string }) => string;
  amountText: (amount: Amount, measure?: HouseholdMeasure) => string;
  /** The dish's title in the cook's language and its key (`shipped:<id>`, the filling included). */
  title: string;
  dish: string;
}

/** The running app, from main.js. */
export interface HandOverEnv {
  w: typeof handOverStrings;
  /** Undefined when the shared database is not there. */
  writer: () => { space: StockSpace; now: () => string; newId: () => string } | undefined;
  spaces: () => { spaces: readonly SpaceView[]; used: SpaceView | undefined };
  listStatus: () => SyncStatus | undefined;
}

export interface HandOverParts {
  env: HandOverEnv;
  /** Absent when the dish cannot be judged now (only the message is drawn then). */
  lack?: HandOverLack;
  session: HandOverSession;
  redraw: () => void;
}

/** The key of a line in the session: its ingredient, or `free:` and its name. */
const keyOf = (line: { ingredientId?: string; name: string }): string =>
  line.ingredientId ?? `free:${line.name}`;

/** The confirmation: the lines to tick, the space, the button. */
const confirmSection = (lack: HandOverLack, parts: HandOverParts): HTMLElement => {
  const { env, session, redraw } = parts;
  const { w } = env;
  const found = lackingLines(lack.report, {
    nameOf: lack.nameOf,
    amountText: lack.amountText,
    title: lack.title,
    dish: lack.dish,
  });
  const all = [...found.lines, ...freeLines(found.free, { title: lack.title, dish: lack.dish })];
  const free = new Set(found.free.map((n) => `free:${n}`));
  const amountOf = new Map(all.map((l) => [keyOf(l), l.amount?.trim() ?? '']));
  /**
   * A line is ticked by the cook's choice, else unless it is free or this page listed it with the
   * amount asked now (at other portions it is ticked, and the hand-over says what differs).
   */
  const settled = (key: string): boolean =>
    session.handed.has(key) && session.handedAt.get(key) === amountOf.get(key);
  const ticked = (key: string): boolean =>
    session.choice.get(key) ?? !(free.has(key) || settled(key));

  const section = el('section', 'handover-confirm');
  section.id = 'handover-confirm';
  const heading = el('h3', undefined, w.heading);
  heading.id = 'handover-heading';
  section.setAttribute('aria-labelledby', heading.id);
  section.append(heading);

  const button = el('button', 'btn primary handover-put');
  button.type = 'button';
  button.dataset['ho'] = 'put';
  const chosen = () => all.filter((l) => ticked(keyOf(l)));
  const label = (): void => {
    const n = chosen().length;
    button.textContent = w.confirm(n);
    button.disabled = n === 0 || session.busy;
  };
  const row = (name: string, amount: string | undefined, key: string): HTMLElement => {
    const item = el('li', 'handover-line');
    const box = el('label', 'choice handover-tick');
    const tick = el('input');
    tick.type = 'checkbox';
    tick.checked = ticked(key);
    tick.dataset['ho'] = `line:${key}`;
    tick.addEventListener('change', () => {
      session.choice.set(key, tick.checked);
      label();
    });
    box.append(tick, el('span', 'handover-name', name));
    if (amount !== undefined) box.append(el('span', 'handover-amount num', amount));
    item.append(box);
    return item;
  };

  const list = el('ul', 'tick-choices handover-lines');
  list.setAttribute('aria-label', w.linesLabel);
  for (const line of found.lines) list.append(row(line.name, line.amount, keyOf(line)));
  section.append(list);
  if (found.free.length > 0) {
    const freeHeading = el('p', 'muted handover-free-heading', w.freeHeading);
    freeHeading.id = 'handover-free-heading';
    const names = el('ul', 'tick-choices handover-lines handover-free');
    names.setAttribute('aria-labelledby', freeHeading.id);
    for (const name of found.free) names.append(row(name, undefined, `free:${name}`));
    section.append(freeHeading, names);
  }
  const { spaces, used } = env.spaces();
  if (spaces.length > 1 && used !== undefined)
    section.append(el('p', 'note-quiet handover-space', w.space(used.name)));
  if (env.listStatus()?.kind === 'failed')
    section.append(el('p', 'note-quiet handover-sync', w.notSynced));

  const close = (): void => {
    session.open = false;
    session.focus = 'offer';
    redraw();
  };
  const cancel = el('button', 'btn quiet handover-cancel', w.cancel);
  cancel.type = 'button';
  cancel.dataset['ho'] = 'cancel';
  cancel.addEventListener('click', close);
  section.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  });
  label();
  button.addEventListener('click', () => {
    const writer = env.writer();
    const inputs = chosen();
    if (session.busy || writer === undefined || inputs.length === 0) return;
    session.busy = true;
    label();
    void handOver(writer.space, inputs, writer)
      .then((done) => {
        session.open = false;
        session.focus = 'said';
        if (!done.ok) {
          session.result = { text: w.writeRefused, differences: [] };
          return;
        }
        const { lines, undo } = done.outcome;
        const keys = new Map<string, string>();
        lines.forEach((line, i) => {
          const input = inputs[i];
          if (input === undefined || line.outcome === 'empty') return;
          session.handed.add(keyOf(input));
          session.handedAt.set(keyOf(input), input.amount?.trim() ?? '');
          // On the list now: the next opening leaves it unticked, whatever the cook ticked.
          session.choice.delete(keyOf(input));
          if (line.id !== undefined && line.outcome !== 'already') keys.set(line.id, keyOf(input));
        });
        // A hand-over that wrote nothing keeps the Undo of the ones before it.
        if (undo.writes.length > 0) session.writes.push({ undo, names: writtenNames(lines), keys });
        session.result = handOverSaid(lines, w);
      })
      .finally(() => {
        session.busy = false;
        redraw();
      });
  });
  const actions = el('div', 'actions handover-actions');
  actions.append(button, cancel);
  section.append(actions);
  return section;
};

/**
 * Takes back every hand-over of the page, the last first; stops at the first refused write. Each
 * entry is said as it ends (`finalOutcome`), and what is no longer on the list to buy (taken off,
 * back as before this dish, removed, ticked as bought) no longer counts as handed over; an entry
 * edited since stays on the list and counts.
 */
const undoAll = async (
  space: StockSpace,
  session: HandOverSession,
): Promise<{ done: UndoOutcome; names: Map<string, string> } | undefined> => {
  const outcomes: UndoOutcome[] = [];
  const names = new Map<string, string>();
  const keys = new Map<string, string>();
  while (session.writes.length > 0) {
    const write = session.writes[session.writes.length - 1];
    if (write === undefined) break;
    const result = await undoHandOver(space, write.undo);
    if (!result.ok) break;
    session.writes.pop();
    outcomes.push(result.outcome);
    for (const [id, name] of write.names) names.set(id, name);
    for (const [id, key] of write.keys) keys.set(id, key);
  }
  if (outcomes.length === 0) return undefined;
  const done = finalOutcome(outcomes);
  const stays = new Set(
    done.kept.filter((id) => !done.gone.includes(id) && !done.bought.includes(id)),
  );
  for (const id of [...done.undone, ...done.kept]) {
    const key = keys.get(id);
    if (key === undefined || stays.has(id)) continue;
    session.handed.delete(key);
    session.handedAt.delete(key);
  }
  return { done, names };
};

/** The message after a hand-over: what happened, Undo while it can, the way to the list. */
const resultBlock = (parts: HandOverParts): HTMLElement | undefined => {
  const { env, session, redraw } = parts;
  const { w } = env;
  const result = session.result;
  if (result === undefined) return undefined;
  const block = el('div', 'handover-result');
  const said = el('div', 'handover-said');
  said.setAttribute('role', 'status');
  said.tabIndex = -1;
  said.dataset['ho'] = 'said';
  said.append(el('p', undefined, result.text));
  block.append(said);
  // The amounts that differ, after the status line: read on demand, not announced.
  if (result.differences.length > 0) {
    const differ = el('ul', 'note-quiet handover-differences');
    differ.setAttribute('aria-label', w.differLabel);
    differ.append(...result.differences.map((d) => el('li', undefined, d)));
    block.append(differ);
  }
  const actions = el('div', 'actions handover-after');
  if (session.writes.length > 0) {
    const back = el('button', 'btn quiet handover-undo', w.undo);
    back.type = 'button';
    back.dataset['ho'] = 'undo';
    back.addEventListener('click', () => {
      const writer = env.writer();
      if (writer === undefined || session.busy) return;
      session.busy = true;
      back.disabled = true;
      void undoAll(writer.space, session)
        .then((taken) => {
          session.result = {
            text: taken === undefined ? w.undoRefused : undoSaid(taken.names, taken.done, w),
            differences: [],
          };
          session.focus = 'said';
        })
        .finally(() => {
          session.busy = false;
          redraw();
        });
    });
    actions.append(back);
  }
  if (session.handed.size > 0 || session.writes.length > 0) {
    const link = el('a', 'btn quiet handover-emptio', w.open);
    link.href = EMPTIO_HREF;
    link.target = '_blank';
    link.rel = 'noopener';
    link.dataset['ho'] = 'emptio';
    actions.append(link);
  }
  if (actions.childElementCount > 0) block.append(actions);
  return block;
};

/** What stands under the offer: the open confirmation, and the message after a hand-over. */
export const handOverParts = (parts: HandOverParts): HTMLElement[] => {
  const out: HTMLElement[] = [];
  if (parts.session.open && parts.lack !== undefined) out.push(confirmSection(parts.lack, parts));
  const result = resultBlock(parts);
  if (result !== undefined) out.push(result);
  return out;
};
