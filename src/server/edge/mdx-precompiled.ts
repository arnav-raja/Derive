import { packedMdx } from "./pack";

/* On the deployed server, lesson phases come compiled in its bundle. */
export function precompiledMdx(key: string): string | null {
  return packedMdx(key);
}
