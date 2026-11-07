/*
 * The counting behind the ordered-choices figure: every ordered choice of k letters from the
 * first n capital letters, in the order the product rule makes them, and the same choices grouped
 * by the set of letters that each holds.
 */

/** The most ordered choices the figure draws at once, so that it stays readable on a phone. */
export const MAX_SHOWN = 120;

/** The first n capital letters, A, B, C and so on. */
export function letters(n: number): string[] {
  return Array.from({ length: n }, (_, i) => String.fromCharCode(65 + i));
}

/** n(n − 1)···(n − k + 1): the number of ordered choices of k things from n different things. */
export function falling(n: number, k: number): number {
  let product = 1;
  for (let i = 0; i < k; i += 1) product *= n - i;
  return product;
}

/** k!, the number of orders of k things. */
export function factorial(k: number): number {
  return falling(k, k);
}

/** The largest k, at least 1, whose ordered choices from n things number at most `limit`. */
export function maxChosen(n: number, limit = MAX_SHOWN): number {
  let k = 1;
  while (k < n && falling(n, k + 1) <= limit) k += 1;
  return k;
}

/**
 * Every ordered choice of k of the items, as the product rule makes them: the first item first,
 * with every ordered choice of the others after it, then the second item first, and so on.
 */
export function orderedChoices<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((first, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const tail of orderedChoices(rest, k - 1)) out.push([first, ...tail]);
  });
  return out;
}

export type SetGroup = { set: string[]; orders: string[][] };

/**
 * The ordered choices gathered by the set of letters each holds: one group for each set, its
 * letters in alphabetical order, holding that set's orders in the order they were made. The
 * groups come in the order their sets first appear.
 */
export function groupBySet(choices: readonly string[][]): SetGroup[] {
  const groups = new Map<string, SetGroup>();
  for (const choice of choices) {
    const set = [...choice].sort();
    const key = set.join("");
    const group = groups.get(key);
    if (group) group.orders.push(choice);
    else groups.set(key, { set, orders: [choice] });
  }
  return [...groups.values()];
}

/** The ordered choices split by their first letter, as the product rule's first step splits them. */
export function byFirst(choices: readonly string[][]): { first: string; choices: string[][] }[] {
  const out: { first: string; choices: string[][] }[] = [];
  for (const choice of choices) {
    const last = out[out.length - 1];
    if (last && last.first === choice[0]) last.choices.push(choice);
    else out.push({ first: choice[0] ?? "", choices: [choice] });
  }
  return out;
}

/** A set of letters as it is written, such as {A, C}. */
export function setText(set: readonly string[]): string {
  return `{${set.join(", ")}}`;
}

function counted(count: number, one: string, many: string): string {
  return `${count.toLocaleString("en-GB")} ${count === 1 ? one : many}`;
}

/** What the figure shows, in words: the count by the product rule and, when grouped, the sets. */
export function choicesWords(n: number, k: number, grouped: boolean): string {
  const total = falling(n, k);
  const what = `${counted(total, "ordered choice", "ordered choices")} of ${counted(k, "letter", "letters")} from ${n}`;
  const base = k === 1 ? `${what}.` : `${what}: ${Array.from({ length: k }, (_, i) => n - i).join(" × ")} = ${total.toLocaleString("en-GB")}.`;
  if (!grouped) return base;
  const orders = factorial(k);
  const sets = total / orders;
  const each = k === 1 ? "and each set has 1 order" : `and each set has ${k}! = ${counted(orders, "order", "orders")}`;
  return `${base} They fall into ${counted(sets, "group", "groups")}, one for each set of ${counted(k, "letter", "letters")}, ${each}.`;
}
