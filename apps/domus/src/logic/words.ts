// A failure in words: the sentence of the storage's kind when there is one, else the general
// one, with what the host package says about it (a status, the time a rate limit ends).
import type { Strings } from '../strings';
import type { Problem } from './failures';

const clock = (iso: string): string => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

/**
 * @param storageType `github` or `webdav` when the failure happened on that kind of storage.
 * @param time Formats the time of a rate limit's end; the default is the device's clock.
 */
export function failureText(
  t: Strings,
  problem: Problem,
  storageType?: string,
  time: (iso: string) => string = clock,
): string {
  const { failure, detail } = problem;
  const texts = t.failures;
  const specific =
    storageType === 'github'
      ? texts.github[failure]
      : storageType === 'webdav'
        ? texts.webdav[failure]
        : undefined;
  const base = specific ?? texts.generic[failure];
  if (failure !== 'server' || detail === undefined) return base;
  const until = /^rate-limited until (.+)$/.exec(detail)?.[1];
  if (until !== undefined) return texts.rateLimitedUntil(time(until));
  if (detail === 'rate-limited') return texts.rateLimited;
  const status = /^HTTP (\d{3})$/.exec(detail)?.[1];
  return status === undefined ? base : `${base}${texts.httpStatus(status)}`;
}
