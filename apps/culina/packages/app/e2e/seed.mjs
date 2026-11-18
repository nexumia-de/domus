// Fills a fresh browser profile with the example records, the way a user does: Settings, then
// "Add example data". The records go through the store like any other.
export const seed = async (page, base) => {
  await page.goto(`${base}${base.endsWith('/') ? '' : '/'}?no-sw#/settings`);
  await page.getByRole('button', { name: 'Add example data' }).click();
  await page.getByText('Example records were added to your notebook.').waitFor();
};
