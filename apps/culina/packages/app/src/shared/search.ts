// Search of the lists: case-insensitive substring of the name, trimmed.

/** Items whose name contains the trimmed query, ignoring case; an empty query keeps all. */
export const filterByName = <T extends { name: string }>(
  items: readonly T[],
  query: string,
): T[] => {
  const needle = query.trim().toLowerCase();
  if (needle === '') return [...items];
  return items.filter((item) => item.name.toLowerCase().includes(needle));
};
