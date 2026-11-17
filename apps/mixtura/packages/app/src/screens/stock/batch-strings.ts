// Fixed texts of the batches on the Stock screen (#101). The words for where a
// batch stands are the batch card's (`screens/spec/shelf-strings.ts`); a date
// that has passed is a fact about the batch, never an alarm.
export const batchStrings = {
  nearTitle: 'Batches Near Their Date',
  nearNote: 'Made by you, with the shelf life you entered. Check these before you use them.',
  more: (n: number) => `and ${n} more ${n === 1 ? 'batch' : 'batches'} at hand`,
  count: (n: number) => `${n} ${n === 1 ? 'batch' : 'batches'}`,
  button: 'Batches',
  buttonAria: (name: string) => `Batches of ${name}`,
  title: (name: string) => `Batches of ${name}`,
  close: 'Close',
  none: 'No batch at hand. Add the day you made one to see how long it keeps.',
  listLabel: 'Batches at hand',
  addTitle: 'Add a batch',
  dateLabel: 'Made on',
  add: 'Add Batch',
  madeToday: 'Made Today',
  madeTodayAria: (name: string) => `I made ${name} today`,
  usedUp: 'Used up',
  usedUpAria: (date: string) => `The batch made on ${date} is used up`,
  dateMissing: 'Choose the day it was made.',
  dateFuture: 'A batch cannot be made in the future.',
  added: (name: string, date: string) => `Added a batch of ${name} made on ${date}`,
  already: (date: string) => `A batch made on ${date} is already recorded.`,
  usedUpToast: (name: string, date: string) =>
    `${name}: the batch made on ${date} is marked as used up`,
  readOnly: 'Batches cannot be recorded because the data could not be opened.',
} as const;
