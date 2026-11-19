// The four top-level destinations, always in this order.

import { icon } from './dom';
import { type Route } from './router';
import { strings } from './strings';

export type DestId = 'drinks' | 'templates' | 'stock' | 'settings';

export interface Destination {
  id: DestId;
  label: string;
  /** Hash of the destination's list. */
  root: string;
  /** First path segments that belong to it. */
  segments: readonly string[];
  icon: () => SVGElement;
}

export const destinations: readonly Destination[] = [
  {
    id: 'drinks',
    label: strings.titles.drinks,
    root: '#/drinks',
    segments: ['drinks'],
    icon: () => icon([['path', { d: 'M5 4h14l-7 9zM12 13v7M8 20h8' }]]),
  },
  {
    id: 'templates',
    label: strings.titles.templates,
    root: '#/templates',
    segments: ['templates'],
    icon: () =>
      icon([
        ['rect', { x: '4', y: '4', width: '7', height: '7' }],
        ['rect', { x: '13', y: '4', width: '7', height: '7' }],
        ['rect', { x: '4', y: '13', width: '7', height: '7' }],
        ['rect', { x: '13', y: '13', width: '7', height: '7' }],
      ]),
  },
  {
    id: 'stock',
    label: strings.titles.stock,
    root: '#/stock',
    segments: ['stock'],
    icon: () => icon([['path', { d: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8' }]]),
  },
  {
    id: 'settings',
    label: strings.titles.settings,
    root: '#/settings',
    segments: ['settings', 'about'],
    icon: () =>
      icon([
        ['circle', { cx: '12', cy: '12', r: '3' }],
        [
          'path',
          {
            d: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1',
          },
        ],
      ]),
  },
];

export function destinationOf(route: Route): DestId | null {
  const first = route.path[0];
  return destinations.find((d) => first !== undefined && d.segments.includes(first))?.id ?? null;
}

export function rootOf(id: DestId): string {
  return destinations.find((d) => d.id === id)?.root ?? '#/drinks';
}
