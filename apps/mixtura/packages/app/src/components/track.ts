// Where a value sits on the track of a balance figure (docs/design.md#drawing-balance):
// the scale runs from one range width below the band to one range width
// above it, so the band is the middle third; values beyond the scale sit
// at the edge. Pure, so the geometry is tested without a browser.

export interface Range {
  min: number;
  max: number;
}

export interface TrackGeometry {
  /** Left edge and width of the band, in percent of the track. */
  bandLeft: number;
  bandWidth: number;
  /** Position of the value in percent, absent without a value. */
  markLeft?: number;
  /** True when the value lies in the band; the diamond is filled then. */
  within?: boolean;
}

export function trackGeometry(range: Range, value?: number): TrackGeometry {
  // A range of no width (a template that says exactly 0) still needs a scale.
  const width =
    range.max > range.min ? range.max - range.min : Math.max(Math.abs(range.max) * 0.2, 0.1);
  const low = range.min - width;
  const span = range.max - range.min + 2 * width;
  const percent = (v: number): number => Math.min(100, Math.max(0, ((v - low) / span) * 100));
  const geometry: TrackGeometry = {
    bandLeft: percent(range.min),
    bandWidth: percent(range.max) - percent(range.min),
  };
  if (value !== undefined) {
    geometry.markLeft = percent(value);
    geometry.within = value >= range.min && value <= range.max;
  }
  return geometry;
}
