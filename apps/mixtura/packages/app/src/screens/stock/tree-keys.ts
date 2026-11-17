// Arrow keys in the stock tree: up and down move between the rows' check
// boxes, right opens a group, left closes it or moves to its parent, Home
// and End jump to the ends. Space and Enter are the buttons' own.

export function treeKeys(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null;
  const toggle = target?.closest<HTMLElement>('[data-toggle]');
  if (
    !toggle ||
    !['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)
  )
    return;
  const list = event.currentTarget as HTMLElement;
  const all = [...list.querySelectorAll<HTMLElement>('[data-toggle]')];
  const at = all.indexOf(toggle);
  const row = toggle.closest<HTMLElement>('[data-row]');
  const expander = row?.querySelector<HTMLElement>('[data-expand]');
  const open = expander?.getAttribute('aria-expanded');
  let next: HTMLElement | undefined;
  if (event.key === 'ArrowDown') next = all[at + 1];
  else if (event.key === 'ArrowUp') next = all[at - 1];
  else if (event.key === 'Home') next = all[0];
  else if (event.key === 'End') next = all[all.length - 1];
  else if (event.key === 'ArrowRight') {
    if (open === 'false') expander?.click();
    else next = all[at + 1];
  } else if (open === 'true') expander?.click();
  else {
    const parent = row?.getAttribute('data-parent');
    next = parent
      ? (list.querySelector<HTMLElement>(`[data-toggle="${CSS.escape(parent)}"]`) ?? undefined)
      : undefined;
  }
  event.preventDefault();
  next?.focus();
}
