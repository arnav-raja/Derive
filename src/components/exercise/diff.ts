/**
 * The lines of `broken` that a break-it exercise marks as changed: those outside a longest common
 * subsequence of the two programs' lines. Two separate edits are marked separately, and the
 * unchanged lines between them are not.
 */
export function changedLines(code: string, broken: string): Set<number> {
  const a = code.trimEnd().split("\n");
  const b = broken.trimEnd().split("\n");
  // common[i][j] is the length of a longest common subsequence of a[i:] and b[j:].
  const common = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      common[i]![j] = a[i] === b[j] ? common[i + 1]![j + 1]! + 1 : Math.max(common[i + 1]![j]!, common[i]![j + 1]!);
    }
  }
  const changed = new Set<number>();
  let i = 0;
  let j = 0;
  while (j < b.length) {
    if (i < a.length && a[i] === b[j]) {
      i += 1;
      j += 1;
    } else if (i < a.length && common[i + 1]![j]! >= common[i]![j + 1]!) {
      i += 1;
    } else {
      changed.add(j);
      j += 1;
    }
  }
  return changed;
}
