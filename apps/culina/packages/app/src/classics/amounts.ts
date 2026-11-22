// How the amounts the engine derived are written on screen. No arithmetic: the engine converted and
// scaled and rounds for display (`roundMass`, `roundPieces`, `roundMeasure`); this picks the words.
// The derived numbers stay as they are: sums and nutrition read them, not this text.
import type {
  Amount,
  DerivedLine,
  DerivedRange,
  HouseholdMeasure,
  StepTemperature,
  StepTime,
} from '@culina/engine';
import { formatMass, formatNumber } from '../shared/mass';
import { measureText, piecesText, unitName } from '../shared/units';
import { strings } from '../strings';

const t = strings.classics;

/**
 * One derived amount as text: grams; millilitres, or the spoon or cup the source wrote; pieces to
 * a whole or a half, the exact count quietly beside where they differ.
 */
export const amountText = (a: Amount, measure?: HouseholdMeasure): string => {
  if (a.unit === 'g') return formatMass(a.value, 'g');
  if (a.unit === 'ml') {
    if (measure !== undefined) return measureText(a.value, measure);
    return `${formatNumber(a.value, a.value < 10 ? 1 : 0)} ${unitName('ml')}`;
  }
  return piecesText(a.value);
};

/** The amount of a line: the source's range when it gave one, else the amount; none for no amount. */
export const lineAmountText = (
  line: Pick<DerivedLine, 'amount' | 'measure'>,
  range: DerivedRange | undefined,
): string | undefined => {
  if (range !== undefined)
    return t.amountRange(amountText(range.min, line.measure), amountText(range.max, line.measure));
  return line.amount === undefined ? undefined : amountText(line.amount, line.measure);
};

const TIME = { s: t.seconds, min: t.minutes, h: t.hours } as const;
const TEMPERATURE = { C: t.celsius, F: t.fahrenheit } as const;

/** A number of a time or temperature in the user's language: "2,5" in German. */
const figure = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : formatNumber(n, 2);

/** Time as the source gives it. */
export const timeText = (time: StepTime): string =>
  TIME[time.unit](figure(time.value) as string, figure(time.to));

/** Temperature as the source gives it. */
export const temperatureText = (temperature: StepTemperature): string =>
  TEMPERATURE[temperature.unit](figure(temperature.value) as string, figure(temperature.to));
