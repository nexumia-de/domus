// The own line drawings of the frame (24 px grid, stroked, no third-party artwork).
const CLOUD = 'M7 18h10.5a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z';

export const FRAME_ICONS = {
  back: 'M19 12H5M12 5l-7 7 7 7',
  settings:
    'M12 6.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 1 0 0-11zM12 9.8a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 1 0 0-4.4zM12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21M5.6 5.6l2.5 2.5M15.9 15.9l2.5 2.5M18.4 5.6l-2.5 2.5M8.1 15.9l-2.5 2.5',
  local: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  never: CLOUD,
  synced: `${CLOUD}M9.5 13l2 2 3.5-3.5`,
  syncing: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  failed: `${CLOUD}M12 10v3M12 15.5v.01`,
  offline: `${CLOUD}M4 4l16 16`,
} as const;

export type FrameIconName = keyof typeof FRAME_ICONS;
