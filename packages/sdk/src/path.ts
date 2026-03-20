/**
 * Path validation utilities for AEP config and user-supplied paths.
 * Prevents path traversal attacks (e.g. `..` or null bytes).
 */

/**
 * Returns true if the path contains path traversal sequences or null bytes.
 * Use before passing user/config paths to file operations.
 *
 * @param path - Path to validate
 * @returns true if path should be rejected (unsafe)
 */
export function rejectPathTraversal(path: string): boolean {
  return path.includes("..") || path.includes("\0");
}
