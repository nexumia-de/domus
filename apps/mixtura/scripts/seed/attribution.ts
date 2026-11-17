// The pinned source and the attribution every output file carries
// (docs/seed-data.md, Attribution). The pin is a file so that the test
// fixture can have its own.
import { readFileSync } from 'node:fs';

export interface Pin {
  name: string;
  repository: string;
  commit: string;
  licence: string;
  holder: string;
  copyright: string;
}

export interface Attribution {
  source: string;
  repository: string;
  commit: string;
  licence: string;
  holder: string;
  notice: string;
}

export function readPin(path: string): Pin {
  return JSON.parse(readFileSync(path, 'utf8')) as Pin;
}

export function attributionOf(pin: Pin): Attribution {
  return {
    source: pin.name,
    repository: pin.repository,
    commit: pin.commit,
    licence: pin.licence,
    holder: pin.holder,
    notice:
      `Recipes and ingredient data: ${pin.name} (${pin.repository}), ` +
      `${pin.licence} License, ${pin.copyright}. Changed by Drink Builder: units, roles ` +
      'and balance figures added, some entries rewritten.',
  };
}

export const sourceOf = (pin: Pin) => ({
  name: pin.name,
  licence: pin.licence,
  url: pin.repository,
  note: `commit ${pin.commit}`,
});
