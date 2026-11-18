import { describe, expect, it } from "vitest";
import { parseIdList } from "@/lib/pokedex/ids";

describe("parseIdList", () => {
  it("parses and de-duplicates ids", () => {
    expect(parseIdList("1,2,2,3")).toEqual([1, 2, 3]);
  });

  it("rejects empty, malformed and zero ids", () => {
    expect(parseIdList(null)).toBeNull();
    expect(parseIdList("")).toBeNull();
    expect(parseIdList("1,a")).toBeNull();
    expect(parseIdList("1,,2")).toBeNull();
    expect(parseIdList("0")).toBeNull();
    expect(parseIdList("-1")).toBeNull();
  });

  it("rejects lists longer than the maximum", () => {
    expect(parseIdList("1,2,3", 2)).toBeNull();
    expect(parseIdList("1,2", 2)).toEqual([1, 2]);
  });
});
