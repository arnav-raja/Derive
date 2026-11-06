import path from "node:path";

import { packedFile, packedKeys } from "./pack";

/*
 * node:fs on the deployed server, which has no files of its own: the content
 * folder is read from the bundle's pack, and nothing may be written. Only the
 * calls the content loaders make are here.
 */

function keyOf(p: unknown): string {
  return path.relative(process.cwd(), path.resolve(String(p))).split(path.sep).join("/");
}

let dirs: Set<string> | null = null;
function directories(): Set<string> {
  if (dirs) return dirs;
  dirs = new Set([""]);
  for (const key of packedKeys()) {
    const parts = key.split("/");
    for (let i = 1; i < parts.length; i++) dirs.add(parts.slice(0, i).join("/"));
  }
  return dirs;
}

function missing(p: unknown): Error {
  return Object.assign(new Error(`ENOENT: no such file or directory, '${String(p)}'`), { code: "ENOENT" });
}

export function existsSync(p: unknown): boolean {
  const key = keyOf(p);
  return packedFile(key) !== null || directories().has(key);
}

export function readFileSync(p: unknown, encoding?: unknown): string {
  void encoding;
  const text = packedFile(keyOf(p));
  if (text === null) throw missing(p);
  return text;
}

type Dirent = { name: string; isDirectory(): boolean; isFile(): boolean };

export function readdirSync(p: unknown, options?: { withFileTypes?: boolean }): string[] | Dirent[] {
  const key = keyOf(p);
  if (!directories().has(key)) throw missing(p);
  const prefix = key ? `${key}/` : "";
  const names = new Map<string, boolean>();
  for (const k of packedKeys()) {
    if (!k.startsWith(prefix)) continue;
    const rest = k.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash < 0) names.set(rest, false);
    else names.set(rest.slice(0, slash), true);
  }
  const sorted = [...names.keys()].sort();
  if (!options?.withFileTypes) return sorted;
  return sorted.map((name) => ({ name, isDirectory: () => names.get(name) === true, isFile: () => names.get(name) === false }));
}

export function statSync(p: unknown): { mtimeMs: number; isFile(): boolean; isDirectory(): boolean } {
  const key = keyOf(p);
  const file = packedFile(key) !== null;
  if (!file && !directories().has(key)) throw missing(p);
  return { mtimeMs: 0, isFile: () => file, isDirectory: () => !file };
}

function readOnly(): never {
  throw new Error("The deployed server has no files to write.");
}

export const writeFileSync = readOnly;
export const mkdirSync = readOnly;
export const renameSync = readOnly;
export const unlinkSync = readOnly;
const fs = { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync, renameSync, unlinkSync };
export default fs;
