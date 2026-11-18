/** The entries before and after the one with the given id; null at either end. */
export function neighbors<T extends { id: number }>(
  list: readonly T[],
  id: number,
): { previous: T | null; next: T | null } {
  const index = list.findIndex((entry) => entry.id === id);
  if (index === -1) return { previous: null, next: null };
  return { previous: list[index - 1] ?? null, next: list[index + 1] ?? null };
}
