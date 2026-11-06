import { Buffer } from "node:buffer";
import { gunzipSync } from "node:zlib";

// @ts-expect-error The build supplies this module: the content folder, packed (scripts/build-api.mjs).
import packed from "virtual:derive-content";

/*
 * The content folder and the compiled lesson phases, packed into the deployed
 * server's bundle when it is built. Each file is gzipped and kept as base64,
 * and unpacked the first time it is read.
 */

type Pack = { files: Record<string, string>; mdx: Record<string, string> };
const pack = packed as Pack;

const unpacked = new Map<string, string>();

function unpack(b64: string): string {
  return gunzipSync(Buffer.from(b64, "base64")).toString("utf8");
}

/** A file's text by its path from the repository root ("content/lessons/M1.1/lesson.yaml"), or null. */
export function packedFile(key: string): string | null {
  const hit = unpacked.get(key);
  if (hit !== undefined) return hit;
  const b64 = pack.files[key];
  if (b64 === undefined) return null;
  const text = unpack(b64);
  unpacked.set(key, text);
  return text;
}

export function packedKeys(): string[] {
  return Object.keys(pack.files);
}

export function packedMdx(hash: string): string | null {
  const b64 = pack.mdx[hash];
  return b64 === undefined ? null : unpack(b64);
}
