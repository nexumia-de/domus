import type { Action, Route } from '../router';
import { historyScreen } from './history';
import { importScreen } from './import/import-screen';
import { componentsScreen } from './components';
import { dishesScreen } from './dishes';
import { componentEditor } from './editor/component-editor';
import { dishEditor } from './editor/dish-editor';
import { ratiosScreen } from './ratios';
import { settingsScreen } from './settings';
import { stockAddScreen } from './stock/stock-add';
import { stockEditScreen } from './stock/stock-edit';
import { stockScreen } from './stock/stock-screen';

const SCREENS: Record<Route, (param?: string) => HTMLElement> = {
  ratios: ratiosScreen,
  components: componentsScreen,
  dishes: dishesScreen,
  stock: stockScreen,
  settings: settingsScreen,
};

const EDITORS: Partial<Record<Route, (id?: string) => HTMLElement>> = {
  components: componentEditor,
  dishes: dishEditor,
};

export const renderScreen = (route: Route, param?: string, action?: Action): HTMLElement => {
  if (action === 'import' && route === 'settings') return importScreen();
  if (route === 'stock' && action === 'add') return stockAddScreen();
  if (route === 'stock' && action === 'edit') return stockEditScreen(param);
  if (action === 'history' && (route === 'components' || route === 'dishes')) {
    return historyScreen(route, param);
  }
  return action === undefined ? SCREENS[route](param) : (EDITORS[route] ?? SCREENS[route])(param);
};
