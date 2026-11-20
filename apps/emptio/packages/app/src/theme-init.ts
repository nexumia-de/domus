/** Classic script loaded before the stylesheet: sets the theme so the first paint is right. */
import { KEYS, applyTheme, browserPrefs, themeOf } from './prefs';

applyTheme(document.documentElement, themeOf(browserPrefs().get(KEYS.theme)));
