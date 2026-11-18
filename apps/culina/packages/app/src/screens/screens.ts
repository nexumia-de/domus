import type { Action, Route } from '../router';
import { historyScreen } from './history';
import { componentsScreen } from './components';
import { dishesScreen } from './dishes';
import { componentEditor } from './editor/component-editor';
import { dishEditor } from './editor/dish-editor';
import { ratiosScreen } from './ratios';
import { settingsScreen } from './settings';

const SCREENS: Record<Route, (param?: string) => HTMLElement> = {
  ratios: ratiosScreen,
  components: componentsScreen,
  dishes: dishesScreen,
  settings: settingsScreen,
};

const EDITORS: Partial<Record<Route, (id?: string) => HTMLElement>> = {
  components: componentEditor,
  dishes: dishEditor,
};

export const renderScreen = (route: Route, param?: string, action?: Action): HTMLElement => {
  if (action === 'history' && (route === 'components' || route === 'dishes')) {
    return historyScreen(route, param);
  }
  return action === undefined ? SCREENS[route](param) : (EDITORS[route] ?? SCREENS[route])(param);
};
