import type { Route } from '../router';
import { componentsScreen } from './components';
import { dishesScreen } from './dishes';
import { ratiosScreen } from './ratios';
import { settingsScreen } from './settings';

const SCREENS: Record<Route, (param?: string) => HTMLElement> = {
  ratios: ratiosScreen,
  components: componentsScreen,
  dishes: dishesScreen,
  settings: settingsScreen,
};

export const renderScreen = (route: Route, param?: string): HTMLElement => SCREENS[route](param);
