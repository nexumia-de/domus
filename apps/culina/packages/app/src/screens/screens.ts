import type { Route } from '../router';
import { componentsScreen } from './components';
import { dishesScreen } from './dishes';
import { ratiosScreen } from './ratios';
import { settingsScreen } from './settings';

const SCREENS: Record<Route, () => HTMLElement> = {
  ratios: ratiosScreen,
  components: componentsScreen,
  dishes: dishesScreen,
  settings: settingsScreen,
};

export const renderScreen = (route: Route): HTMLElement => SCREENS[route]();
