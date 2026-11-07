/*
 * Lesson phases compiled ahead of time, by the hash of their source. The local
 * server has none and compiles as it goes; the deployed server's build swaps
 * this module for one that reads the phases compiled into its bundle.
 */
export function precompiledMdx(key: string): string | null {
  void key;
  return null;
}
