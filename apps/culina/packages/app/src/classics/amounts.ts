// How the amounts the engine derived are written on screen. No arithmetic: the engine converted and
// scaled; this only rounds once for display with the shared helpers and picks the words.
import type { Amount, DerivedLine, DerivedRange, StepTemperature, StepTime } from '@culina/engine';
import { formatMass, formatNumber } from '../shared/mass';
import { strings } from '../strings';

const t = strings.classics;

/** One derived amount (grams, millilitres or pieces) as text. */
export const amountText = (a: Amount): string => {
  if (a.unit === 'g') return formatMass(a.value, 'g');
  if (a.unit === 'ml') return `${formatNumber(a.value, a.value < 10 ? 1 : 0)} ml`;
  return t.pieces(formatNumber(a.value, 1));
};

/** The amount of a line: the source's range when it gave one, else the amount; none for no amount. */
export const lineAmountText = (
  line: Pick<DerivedLine, 'amount'>,
  range: DerivedRange | undefined,
): string | undefined => {
  if (range !== undefined) return t.amountRange(amountText(range.min), amountText(range.max));
  return line.amount === undefined ? undefined : amountText(line.amount);
};

const TIME = { s: t.seconds, min: t.minutes, h: t.hours } as const;
const TEMPERATURE = { C: t.celsius, F: t.fahrenheit } as const;

/** Time as the source gives it. */
export const timeText = (time: StepTime): string => TIME[time.unit](time.value, time.to);

/** Temperature as the source gives it. */
export const temperatureText = (temperature: StepTemperature): string =>
  TEMPERATURE[temperature.unit](temperature.value, temperature.to);
