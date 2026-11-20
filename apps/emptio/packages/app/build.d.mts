export const GITHUB_API: string;
export function buildApp(options?: {
  outdir?: string;
  githubApi?: string;
}): Promise<{ outdir: string; files: string[]; version: string }>;
