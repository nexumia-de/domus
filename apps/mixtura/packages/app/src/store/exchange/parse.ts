// Reading an export file is the engine's rule (parseExportFile); the schema
// check is the app's (validators compiled at build time), so the app passes it in.

import {
  parseExportFile as parseWith,
  type ExportParseOptions,
  type ParseResult,
} from '@mixtura/engine';
import { exportProblems } from '../validate';

export type { ParseFailure, ExportParseOptions, ParseResult } from '@mixtura/engine';

/** `bytes` is the size reported by the browser for the file, checked before and after reading. */
export const parseExportFile = (
  text: string,
  bytes: number,
  options: ExportParseOptions = {},
): ParseResult => parseWith(text, bytes, exportProblems, options);
