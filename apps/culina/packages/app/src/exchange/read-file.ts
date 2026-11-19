// Reads the text of an export file with the engine and turns a refusal into one quiet sentence.
// Nothing is stored here: a file that is refused leaves the notebook as it was.
import { parseExport } from '@culina/engine';
import type { ExportContent, ExportError } from '@culina/engine';
import { strings } from '../strings';
import { recordValidators } from './validators';

const text = strings.importing;

export const refusalText = (error: ExportError): string => {
  switch (error.code) {
    case 'not-json':
      return text.notReadable;
    case 'not-an-export':
      return text.notAnExport;
    case 'bad-version':
      return text.unknownVersion;
    case 'newer-version':
      return text.newerVersion(error.found ?? 0, error.supported ?? 0);
    case 'bad-migration':
      return text.olderNotConverted;
    case 'unknown-field':
      return text.unknownField(error.field ?? '');
    case 'duplicate-id':
      return text.repeatedId(text.kinds[error.kind ?? 'ingredients'], (error.index ?? 0) + 1);
    default:
      return text.notFitting(text.kinds[error.kind ?? 'ingredients'], (error.index ?? 0) + 1);
  }
};

export type ReadResult = { ok: true; content: ExportContent } | { ok: false; message: string };

export const readExportText = (content: string): ReadResult => {
  const parsed = parseExport(content, recordValidators);
  return parsed.ok
    ? parsed
    : { ok: false, message: `${refusalText(parsed.error)} ${text.nothingChanged}` };
};
