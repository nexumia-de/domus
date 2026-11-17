// The keyboard rules of the drinks list as pure functions: which single-key
// shortcut a key press is, and where an arrow key moves among the rows
// (docs/behaviour.md#interaction-rules).

export type Shortcut = 'search' | 'new';

export interface KeyPress {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  /** The key goes into a text field, a select or an editable element. */
  typing: boolean;
  /** A modal dialog is open. */
  modal: boolean;
  /** The user has single-key shortcuts on (Settings, WCAG 2.1.4). */
  enabled: boolean;
}

/**
 * The shortcut a key press asks for: `/` focuses search, `n` starts a new
 * drink. Never while typing, with a modifier (Ctrl+N and Cmd+N belong to
 * the browser), over a dialog, after another handler took the key, or with
 * shortcuts turned off.
 */
export function shortcutFor(press: KeyPress): Shortcut | undefined {
  if (!press.enabled || press.typing || press.modal || press.defaultPrevented) return undefined;
  if (press.ctrlKey || press.metaKey || press.altKey) return undefined;
  if (press.key === '/') return 'search';
  if (press.key === 'n') return 'new';
  return undefined;
}

/** Where an arrow key moves: a row, the search field above the rows, the button below them. */
export type RowStep = { to: 'row'; index: number } | { to: 'search' } | { to: 'more' };

/**
 * One step from row `at` (-1 is the search field) among `count` rows.
 * Down from the last row reaches the "Show more drinks" button when there is
 * one; up from the first row reaches the search field. Home and End jump to
 * the first and last row; they are for rows only, the field keeps them for
 * its caret.
 */
export function rowStep(
  key: string,
  at: number,
  count: number,
  hasMore: boolean,
): RowStep | undefined {
  if (count === 0) return undefined;
  if (key === 'ArrowDown') {
    if (at + 1 < count) return { to: 'row', index: at + 1 };
    return hasMore ? { to: 'more' } : undefined;
  }
  if (key === 'ArrowUp') {
    if (at > 0) return { to: 'row', index: at - 1 };
    return at === 0 ? { to: 'search' } : undefined;
  }
  if (at < 0) return undefined;
  if (key === 'Home') return { to: 'row', index: 0 };
  if (key === 'End') return { to: 'row', index: count - 1 };
  return undefined;
}
