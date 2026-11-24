/** A frame file of data/frames/<id>.json (docs/classic-format.md, A frame). */
export interface FrameFile {
  id: string;
  name: { en: string; de: string };
  originalName: string;
  country: string;
  course: string;
  persons: number;
  year: number;
  vegetarian?: boolean;
  slots: {
    role: string;
    parts?: string[];
    ingredient?: string;
    amount?: { value: number; unit: string };
    optional?: boolean;
  }[];
  note?: { en: string; de: string };
}
/** One frame as a base, or the reasons it cannot be composed. */
export function composeFrame(
  frame: FrameFile,
  recipes: ReadonlyMap<string, unknown>,
): { ok: true; classic: unknown } | { ok: false; problems: string[] };
/** Every frame as a base; throws with every problem when one cannot be composed. */
export function composeFrames(
  frames: readonly FrameFile[],
  classics: readonly unknown[],
): unknown[];
