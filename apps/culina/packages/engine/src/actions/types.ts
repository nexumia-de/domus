// A plain action: a word for a step that teaches nothing (set aside, drain, serve). Shipped
// read-only in data/actions.json. A technique is the other kind of word: it has a note and sources.
import type { I18nText } from '../text/i18n';

export interface Action {
  id: string;
  name: I18nText;
}
