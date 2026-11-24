// node tools/content/find-ingredient.mjs <word> [<word>...] : catalogue rows whose English or German name contains every word
import { readFileSync } from 'node:fs';
const c = JSON.parse(
  readFileSync(
    new URL('../../packages/app/data/ingredient-catalogue.json', import.meta.url),
    'utf8',
  ),
);
const words = process.argv.slice(2).map((w) => w.toLowerCase());
for (const r of c.ingredients) {
  const hay = [r.name, r.names?.de?.name, ...(r.names?.de?.aliases ?? [])]
    .join(' | ')
    .toLowerCase();
  if (!words.every((w) => hay.includes(w))) continue;
  const bits = [r.id, r.name, 'de: ' + r.names?.de?.name];
  if (r.unitWeightG) bits.push('1 piece = ' + r.unitWeightG.value + ' g');
  if (r.densityGPerMl)
    bits.push('density ' + r.densityGPerMl.value + ' g/ml (count/tsp/tbsp/cup/ml usable)');
  if (!r.unitWeightG && !r.densityGPerMl) bits.push('mass amounts only');
  console.log(bits.join('  ·  '));
}
