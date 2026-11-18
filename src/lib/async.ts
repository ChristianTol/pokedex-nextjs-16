/**
 * Like Promise.all(items.map(fn)), but runs at most `limit` calls at once, so
 * a long list doesn't hit an API with hundreds of simultaneous requests.
 * Results keep the order of `items`.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(Math.max(limit, 1), items.length) }, worker),
  );
  return results;
}
