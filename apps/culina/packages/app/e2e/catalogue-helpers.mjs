// Shared by the catalogue browser checks: the generated file, its tree, and the picker controls.
import { readFileSync } from 'node:fs';

export const file = JSON.parse(
  readFileSync(new URL('../data/ingredient-catalogue.json', import.meta.url), 'utf8'),
);
const byId = new Map(file.ingredients.map((r) => [r.id, r]));

export const rowNamed = (name) => {
  const row = file.ingredients.find((r) => r.name === name);
  if (!row) throw new Error(`catalogue row ${name} not found`);
  return row;
};

/** The name the app shows for a row: its kitchen name when it has one, in the language, else its catalogue name. */
export const shownName = (row, lang = 'en') => row['x-kitchen']?.[lang] ?? row.name;

/** The entries above `row`, root first. */
export const chainOf = (row) => {
  const chain = [];
  for (let at = byId.get(row.parentId); at; at = byId.get(at.parentId)) chain.unshift(at);
  return chain;
};

/** The ids a notebook holds after choosing these rows: each row with its chain, sorted. */
export const idsWithChains = (...rows) =>
  [...new Set(rows.flatMap((r) => [...chainOf(r), r].map((x) => x.id)))].sort();

export const searchBox = (page) => page.getByLabel('Search your notebook');

export const addLine = async (page) => {
  await page.getByRole('button', { name: 'Add an ingredient' }).click();
  await searchBox(page).waitFor();
};

export const setAmount = async (page, index, amount, unit) => {
  const line = page.locator('.line-edit').nth(index);
  await line.locator('input.field').first().fill(amount);
  await line.locator('select').selectOption(unit);
};
