// The quiet sentence for a refused Cooklang save: an engine code or a store code.
import { strings } from '../../strings';

export const cookText = (code: string, storeText: (code: string) => string): string => {
  switch (code) {
    case 'needs-facts':
      return strings.importing.cookNotFacts;
    case 'unreadable':
      return strings.importing.cookNotReadable;
    case 'invalid-grams':
      return strings.importing.cookGramsNotAllowed;
    case 'no-lines':
      return strings.importing.cookNoLines;
    default:
      return storeText(code);
  }
};
