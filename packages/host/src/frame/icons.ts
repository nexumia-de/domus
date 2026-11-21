// The own line drawings of the frame (24 px grid, stroked, no third-party artwork).
const CLOUD = 'M7 18h10.5a4 4 0 0 0 .5-7.97 6 6 0 0 0-11.5 1.5A3.5 3.5 0 0 0 7 18z';

export const FRAME_ICONS = {
  back: 'M19 12H5M12 5l-7 7 7 7',
  settings:
    'M10.0 5.5L10.3 3.2L13.7 3.2L14.0 5.5L15.2 6.0L17.0 4.5L19.5 7.0L18.0 8.8L18.5 10.0L20.8 10.3L20.8 13.7L18.5 14.0L18.0 15.2L19.5 17.0L17.0 19.5L15.2 18.0L14.0 18.5L13.7 20.8L10.3 20.8L10.0 18.5L8.8 18.0L7.0 19.5L4.5 17.0L6.0 15.2L5.5 14.0L3.2 13.7L3.2 10.3L5.5 10.0L6.0 8.8L4.5 7.0L7.0 4.5L8.8 6.0zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 1 0 0-5z',
  local: 'M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM11 18h2',
  never: CLOUD,
  synced: `${CLOUD}M9.5 13l2 2 3.5-3.5`,
  syncing: 'M20 11a8 8 0 0 0-14-4L4 9M4 4v5h5M4 13a8 8 0 0 0 14 4l2-2M20 20v-5h-5',
  failed: `${CLOUD}M12 10v3M12 15.5v.01`,
  offline: `${CLOUD}M4 4l16 16`,
} as const;

export type FrameIconName = keyof typeof FRAME_ICONS;
