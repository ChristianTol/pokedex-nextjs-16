import { describe, expect, it } from "vitest";
import { formItem } from "@/lib/pokedex/form-items";

describe("formItem", () => {
  it("knows the orbs of the primal forms", () => {
    expect(formItem("groudon-primal")).toBe("red-orb");
    expect(formItem("kyogre-primal")).toBe("blue-orb");
  });

  it("knows the Mega Stones, also when there are two forms", () => {
    expect(formItem("venusaur-mega")).toBe("venusaurite");
    expect(formItem("charizard-mega-x")).toBe("charizardite-x");
    expect(formItem("charizard-mega-y")).toBe("charizardite-y");
  });

  it("knows the Ogerpon masks", () => {
    expect(formItem("ogerpon-wellspring-mask")).toBe("wellspring-mask");
  });

  it("is null for a form without an item", () => {
    expect(formItem("rayquaza-mega")).toBeNull();
    expect(formItem("pikachu")).toBeNull();
  });
});
