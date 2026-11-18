type Options<T> = {
  /** localStorage key. */
  key: string;
  /** The value before anything is stored, and during server rendering. */
  empty: T;
  parse: (raw: string | null) => T;
  serialize: (value: T) => string;
};

/**
 * A value in localStorage that every component sees the same, shaped for
 * `useSyncExternalStore`. Falls back to memory when localStorage is
 * unavailable (e.g. private mode).
 */
export function createPersistedStore<T>({
  key,
  empty,
  parse,
  serialize,
}: Options<T>) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = empty;
  let memoryOnly = false;

  function read(): T {
    if (memoryOnly) return cached;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      memoryOnly = true;
      return cached;
    }
    // getSnapshot must return the same value until the data really changes.
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cached = parse(raw);
    }
    return cached;
  }

  function write(next: T) {
    cached = next;
    try {
      const raw = serialize(next);
      window.localStorage.setItem(key, raw);
      cachedRaw = raw;
    } catch {
      memoryOnly = true;
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    // Another tab changed the value.
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return { empty, read, write, subscribe };
}
