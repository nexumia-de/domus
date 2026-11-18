/**
 * Test hook for the browser test: a page opened with `?e2e-now=<ISO instant>` runs on that
 * clock, so the backup reminder can be tested without waiting. Inert without the query.
 */
export const e2eNow = (search: string): (() => string) | undefined => {
  const value = new URLSearchParams(search).get('e2e-now');
  return value !== null && !Number.isNaN(Date.parse(value)) ? () => value : undefined;
};
