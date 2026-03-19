/** Canonical public GitHub org/repo; update if the organization slug changes. */
export const GITHUB_REPO = "https://github.com/economicagents/aep";

export function githubBlobPath(repoPath: string): string {
  const p = repoPath.replace(/^\//, "");
  return `${GITHUB_REPO}/blob/main/${p}`;
}

export const GITHUB_ISSUES = `${GITHUB_REPO}/issues`;
export const GITHUB_SECURITY_ADVISORY = `${GITHUB_REPO}/security/advisories/new`;
export const GITHUB_DOCS_TREE = `${GITHUB_REPO}/blob/main/docs`;
