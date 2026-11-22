// The top-level destinations: the first three are in the bottom bar (the rail on wide screens),
// Settings is the icon in the header.

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
  /** In the bottom bar; Settings is in the header instead and has no icon here. */
  inBar: boolean;
  icon?: () => SVGElement;
}

export const destinations: readonly Destination[] = [
  {
    id: 'drinks',
    label: strings.titles.drinks,
    root: '#/drinks',
    segments: ['drinks'],
    inBar: true,
    icon: () => icon([['path', { d: 'M5 4h14l-7 9zM12 13v7M8 20h8' }]]),
  },
  {
    id: 'templates',
    label: strings.titles.templates,
    root: '#/templates',
    segments: ['templates'],
    inBar: true,
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
    inBar: true,
    icon: () => icon([['path', { d: 'M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8' }]]),
  },
  {
    id: 'settings',
    label: strings.titles.settings,
    root: '#/settings',
    segments: ['settings', 'about'],
    inBar: false,
  },
];

export function destinationOf(route: Route): DestId | null {
  const first = route.path[0];
  return destinations.find((d) => first !== undefined && d.segments.includes(first))?.id ?? null;
}

/** Where Back goes when the app was opened on a screen of the destination: Settings returns to the drinks. */
export function rootOf(id: DestId): string {
  if (id === 'settings') return '#/drinks';
  return destinations.find((d) => d.id === id)?.root ?? '#/drinks';
}
