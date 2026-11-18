import { describe, expect, it } from "vitest";
import { THEME_INIT_SCRIPT, isTheme, resolveTheme } from "@/lib/theme";

describe("resolveTheme", () => {
  it("uses the stored choice, whatever the system prefers", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("follows the system without a (valid) stored choice", () => {
    expect(resolveTheme(null, true)).toBe("dark");
    expect(resolveTheme(null, false)).toBe("light");
    expect(resolveTheme("sepia", true)).toBe("dark");
  });
});

describe("isTheme", () => {
  it("accepts light and dark only", () => {
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("auto")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
  });
});

describe("THEME_INIT_SCRIPT", () => {
  // Run it against a fake document to check it agrees with resolveTheme.
  function run(stored: string | null, systemDark: boolean): boolean {
    const classes = new Set<string>();
    const fakeWindow = {
      localStorage: { getItem: () => stored },
      matchMedia: () => ({ matches: systemDark }),
    };
    const fakeDocument = {
      documentElement: {
        classList: {
          toggle: (name: string, force: boolean) =>
            force ? classes.add(name) : classes.delete(name),
        },
      },
    };
    new Function("localStorage", "window", "document", THEME_INIT_SCRIPT)(
      fakeWindow.localStorage,
      fakeWindow,
      fakeDocument,
    );
    return classes.has("dark");
  }

  it("matches resolveTheme for every combination", () => {
    for (const stored of [null, "light", "dark", "sepia"]) {
      for (const systemDark of [true, false]) {
        expect(run(stored, systemDark)).toBe(
          resolveTheme(stored, systemDark) === "dark",
        );
      }
    }
  });
});
