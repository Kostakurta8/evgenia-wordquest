/** Fisher–Yates. Returns a new array; never mutates the input. */
export function shuffle<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** n distinct random picks (excluding `exclude`), order randomized. */
export function pick<T>(pool: readonly T[], n: number, exclude: (item: T) => boolean): T[] {
  return shuffle(pool.filter((x) => !exclude(x))).slice(0, n);
}
