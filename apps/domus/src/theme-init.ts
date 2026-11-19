/** Classic script loaded before the stylesheet: sets data-theme so the first paint is right. */
import { applyTheme, browserStore, readTheme } from './prefs';

applyTheme(document.documentElement, readTheme(browserStore()));
