// The old addresses of the classics, #/classics and #/classics/<country>: the shipped dishes are
// part of the one list of dishes now. Such an address sets the one stored filter to the shipped
// dishes (of that country) and is replaced by #/dishes, without a new history entry
// (`classicsRedirect`, handed to the router in main.ts), so that links and bookmarks keep working.
import { classicsFilter } from '../../browse/list-view';
import { hashFor, type Route } from '../../router';
import { dishesScreen } from '../dishes';
import { keepDishFilter } from '../dish-list';

/** For an address of the classics: stores its filter and gives the address of the list. */
export const classicsRedirect = (route: Route, param: string | undefined): string | undefined => {
  if (route !== 'classics') return undefined;
  keepDishFilter(classicsFilter(param));
  return hashFor('dishes');
};

/** Only reached without the router's redirect: the same filter, and the list of dishes. */
export const classicsScreen = (param?: string): HTMLElement => {
  keepDishFilter(classicsFilter(param));
  return dishesScreen();
};
