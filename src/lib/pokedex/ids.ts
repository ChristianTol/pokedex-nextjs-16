export const MAX_SUMMARY_IDS = 60;

/**
 * Parses a comma-separated id list such as "1,2,3". Returns null when the
 * input is empty, malformed, or longer than `max`.
 */
export function parseIdList(
  raw: string | null,
  max = MAX_SUMMARY_IDS,
): number[] | null {
  if (!raw) return null;
  const parts = raw.split(",");
  if (parts.length > max) return null;
  const ids = parts.map((part) =>
    /^\d{1,5}$/.test(part) ? Number(part) : NaN,
  );
  if (ids.some((id) => !Number.isInteger(id) || id < 1)) return null;
  return [...new Set(ids)];
}
