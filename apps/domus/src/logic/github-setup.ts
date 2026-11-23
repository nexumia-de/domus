// What the GitHub steps decide, apart from the screens: which repository a token
// leads to, and what to say about the repository once it was looked at.
import {
  githubVerdict,
  type FindRepositoriesResult,
  type GithubConnectionResult,
  type RepositoryEntry,
} from '@nexumia-de/hospes';
import type { Problem } from './failures';

export type RepositoryChoice =
  /** Exactly one repository the token may write to: use it. */
  | { kind: 'use'; repository: string }
  /** Several: the person picks. */
  | { kind: 'pick'; repositories: RepositoryEntry[] }
  | { kind: 'none' }
  /** Repositories are reachable, none of them writable. */
  | { kind: 'none-writable' }
  | { kind: 'failed'; problem: Problem };

export function chooseRepository(result: FindRepositoriesResult): RepositoryChoice {
  if (!result.ok) {
    const { failure, detail } = result;
    return { kind: 'failed', problem: detail === undefined ? { failure } : { failure, detail } };
  }
  const writable = result.repositories.filter((r) => r.canWrite);
  if (writable.length === 0) {
    return result.repositories.length === 0 ? { kind: 'none' } : { kind: 'none-writable' };
  }
  const [only] = writable;
  if (writable.length === 1 && only) return { kind: 'use', repository: only.fullName };
  return { kind: 'pick', repositories: writable };
}

export type Verdict =
  | { kind: 'ok' }
  /** Works, but the repository is public: the files are encrypted, their existence is not secret. */
  | { kind: 'public' }
  /** The token cannot write: blocked. */
  | { kind: 'readonly' }
  | { kind: 'failed'; problem: Problem };

/** The host package's verdict (shared with the native apps), with a failure as the screens carry it. */
export function verdictOf(test: GithubConnectionResult): Verdict {
  const verdict = githubVerdict(test);
  if (verdict.kind !== 'failed') return verdict;
  const { failure, detail } = verdict;
  return { kind: 'failed', problem: detail === undefined ? { failure } : { failure, detail } };
}
