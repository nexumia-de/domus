// The source lines of shipped dishes and technique notes as a reader sees them, and the date form.
import { expect, test } from 'vitest';
import { citeText } from '../src/screens/classics/cite';
import { formatDate } from '../src/shared/locale';
import { stringsDe, stringsEn } from '../src/strings';
import { shippedTexts } from './content-texts';

test('the transcriber’s line numbers and file names are never shown', () => {
  const place =
    'Première partie, "Omelette aux fines herbes", pp. 273-274; gouffe.txt lines 14702-14761';
  expect(citeText(place, 'en')).toBe('Première partie, "Omelette aux fines herbes", pp. 273-274');
  expect(citeText(place, 'de')).toBe('Première partie, „Omelette aux fines herbes“, S. 273-274');
  expect(citeText("p. 733, section 'Arlequín de judías'; lines 32958–32978", 'de')).toBe(
    "S. 733, Abschn. 'Arlequín de judías'",
  );
  expect(
    citeText(
      "p. 173, section Salsas, recipe 'Salsa ayoli ó ayoli' (running head garbled in the OCR); lines 8196–8215",
      'en',
    ),
  ).toBe("p. 173, section Salsas, recipe 'Salsa ayoli ó ayoli'");
});

test('German citations use Kap., Abschn., Aufl., S. and Nr.', () => {
  expect(citeText('chapter 10.1 Eggs, section Pan-Frying', 'de')).toBe(
    'Kap. 10.1 Eggs, Abschn. Pan-Frying',
  );
  expect(
    citeText(
      'Der junge Koch / Die junge Köchin (Brandes, Harten, Krödel, Voll, Wolffgang), 38th edition, Pfanneberg 2022',
      'de',
    ),
  ).toContain('38. Aufl., Pfanneberg 2022');
  expect(
    citeText('Le Livre de cuisine (fourth edition, Paris: Librairie Hachette et Cie, 1877)', 'de'),
  ).toBe('Le Livre de cuisine (4. Aufl., Paris: Librairie Hachette et Cie, 1877)');
  expect(citeText('chapter Meat, The Searing Question (box), p. 161', 'de')).toBe(
    'Kap. Meat, The Searing Question (Kasten), S. 161',
  );
  expect(citeText('Division K, No. 6', 'de')).toBe('Abt. K, Nr. 6');
  // English keeps the words as written.
  expect(citeText('chapter 10.1 Eggs, section Pan-Frying', 'en')).toBe(
    'chapter 10.1 Eggs, section Pan-Frying',
  );
});

test('the year stands once when the title ends with its imprint', () => {
  const title = 'Le Livre de cuisine (4. Aufl., Paris: Librairie Hachette et Cie, 1877)';
  expect(stringsDe.classics.sourceLine('Jules Gouffé', title, 1877)).toBe(`Jules Gouffé, ${title}`);
  expect(stringsEn.classics.sourceLine('Henriette Davidis', 'A Practical Book', 1904)).toBe(
    'Henriette Davidis, A Practical Book, 1904',
  );
});

test('a date is shown in the form of the language', () => {
  expect(formatDate('2026-11-18', 'de')).toBe('18.11.2026');
  expect(formatDate('2026-11-21T09:30:00.000Z', 'de')).toBe('21.11.2026');
  expect(formatDate('2026-01-05', 'en')).toBe('5 Jan 2026');
  expect(formatDate('not a date', 'de')).toBe('not a date');
});

test('a cuisine is named by its adjective, never by the country', () => {
  expect(stringsDe.browse.cuisines).toEqual({
    de: 'Deutsche Küche',
    it: 'Italienische Küche',
    fr: 'Französische Küche',
    es: 'Spanische Küche',
  });
  expect(Object.keys(stringsEn.browse.cuisines).sort()).toEqual(
    Object.keys(stringsEn.classics.countries).sort(),
  );
});

test('no shipped text names a transcript file or an internal field', () => {
  for (const t of shippedTexts()) {
    for (const text of [t.en, t.de]) {
      expect(text, t.where).not.toMatch(
        /\.txt\b|\bsettled\)|Belegdatei|evidence file|[Vv]alidator/,
      );
    }
  }
});
