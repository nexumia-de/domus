// Fixed texts of the batch card of a prepared ingredient (#37). Neutral words:
// a date that has passed is a fact about the batch, never an alarm; the app
// proposes no shelf life and no storage.
export const shelfStrings = {
  title: 'Your batch',
  shelfLife: (days: number) => `Shelf life: ${days} ${days === 1 ? 'day' : 'days'}`,
  limitedBy: (name: string) => `set by ${name}`,
  noShelfLife: 'No shelf life entered. You can add your own in Edit.',
  storage: (text: string) => `Keep: ${text}`,
  noBatch: 'No batch recorded. Mark when you made it to see how long it keeps.',
  madeOn: (made: string, useBy: string | undefined) =>
    useBy === undefined ? `Made on ${made}` : `Made on ${made} · use by ${useBy}`,
  fresh: (left: number) => `Within its shelf life, ${left} ${left === 1 ? 'day' : 'days'} left`,
  useSoon: (left: number) =>
    left === 0
      ? 'Use soon: the last day of its shelf life is today'
      : `Use soon: ${left} ${left === 1 ? 'day' : 'days'} left`,
  past: (days: number) =>
    `Past the date you set by ${days} ${days === 1 ? 'day' : 'days'}. Check it before you use it.`,
  unknown: 'No shelf life entered, so no date to compare.',
  invalid: 'The made-on date is not a date.',
  alreadyRecorded: 'A batch made on that day is already recorded.',
  otherBatches: (n: number) =>
    `${n} more ${n === 1 ? 'batch' : 'batches'} at hand, see Stock. This card shows the newest.`,
  madeThis: 'I made this',
  madeThisAria: (name: string) => `I made ${name} today`,
  otherDay: 'Made on another day',
  dateLabel: 'Made on',
  setDate: 'Set Date',
  usedUp: 'Used up',
  usedUpAria: (name: string) => `${name} is used up`,
  recorded: (name: string, date: string) => `${name} marked as made on ${date}`,
  usedUpToast: (name: string) => `${name} marked as used up`,
  readOnly: 'Batches cannot be recorded because the data could not be opened.',
};
