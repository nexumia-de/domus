import type { Action, Route } from '../router';
import { classicsScreen } from './classics/classics-list';
import { historyScreen } from './history';
import { importScreen } from './import/import-screen';
import { cookClassicScreen, cookComponentScreen, cookDishScreen } from './component-cook';
import { componentsScreen } from './components';
import { cookScreen } from './cook/cook-screen';
import { cookListScreen } from './cook/cook-list';
import { randomDishScreen } from './dish-random';
import { classicScreen } from './dish-detail';
import { dishesScreen } from './dishes';
import { componentEditor } from './editor/component-editor';
import { dishEditor } from './editor/dish-editor';
import { ratiosScreen } from './ratios';
import { settingsScreen } from './settings';
import { stockAddScreen } from './stock/stock-add';
import { stockEditScreen } from './stock/stock-edit';
import { stockScreen } from './stock/stock-screen';

const SCREENS: Record<Route, (param?: string) => HTMLElement> = {
  classics: classicsScreen,
  classic: classicScreen,
  ratios: ratiosScreen,
  components: componentsScreen,
  dishes: dishesScreen,
  // #/cook/use-up is replaced by #/cook before a screen is drawn (cookRedirect in main.ts).
  cook: () => cookListScreen(),
  stock: stockScreen,
  settings: settingsScreen,
};

const EDITORS: Partial<Record<Route, (id?: string) => HTMLElement>> = {
  components: componentEditor,
  dishes: dishEditor,
};

export const renderScreen = (route: Route, param?: string, action?: Action): HTMLElement => {
  if (action === 'cook' && route === 'classic') return cookClassicScreen(param);
  if (action === 'cook' && route === 'components') return cookComponentScreen(param);
  if (action === 'cook' && route === 'dishes') return cookDishScreen(param);
  if (action === 'random' && route === 'dishes') return randomDishScreen();
  if (action === 'import' && route === 'settings') return importScreen();
  if (route === 'cook' && action === 'with') return cookScreen(param);
  if (route === 'stock' && action === 'add') return stockAddScreen();
  if (route === 'stock' && action === 'edit') return stockEditScreen(param);
  if (action === 'history' && (route === 'components' || route === 'dishes')) {
    return historyScreen(route, param);
  }
  return action === undefined ? SCREENS[route](param) : (EDITORS[route] ?? SCREENS[route])(param);
};
