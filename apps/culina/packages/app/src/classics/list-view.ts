// The classics by country, as the lists show them. Pure: no DOM.
import { pickText } from '@culina/engine';
import type { Classic, Country, Course, Lang } from '@culina/engine';

/** The countries in the order they are offered. */
export const COUNTRIES: readonly Country[] = ['de', 'it', 'fr', 'es'];

export const isCountry = (value: string | undefined): value is Country =>
  COUNTRIES.some((c) => c === value);

export interface CountryChoice {
  country: Country;
  count: number;
}

/** Every country with the number of its dishes (an empty country is still offered). */
export const countryChoices = (classics: readonly Classic[]): CountryChoice[] =>
  COUNTRIES.map((country) => ({
    country,
    count: classics.filter((c) => c.country === country).length,
  }));

export interface ClassicRow {
  id: string;
  name: string;
  course: Course;
  vegetarian: boolean;
}

/** The dishes of one country in their order, named in the content language. */
export const classicRows = (
  classics: readonly Classic[],
  country: Country,
  lang: Lang,
): ClassicRow[] =>
  classics
    .filter((c) => c.country === country)
    .map((c) => ({
      id: c.id,
      name: pickText(c.name, lang),
      course: c.course,
      vegetarian: c.vegetarian,
    }));
