import { describe, expect, it } from "vitest";
import { LANGUAGES } from "@/lib/i18n/languages";
import { translate, translateOptional } from "@/lib/i18n/messages";

describe("messages", () => {
  it("translates a key in every language", () => {
    expect(translate("nl", "detail.height")).toBe("Lengte");
    expect(translate("en", "detail.height")).toBe("Height");
    expect(translate("de", "detail.height")).toBe("Größe");
    expect(translate("fr", "detail.height")).toBe("Taille");
    expect(translate("ja", "detail.height")).toBe("たかさ");
    expect(translate("es", "detail.height")).toBe("Altura");
    expect(translate("it", "detail.height")).toBe("Altezza");
    expect(translate("ko", "detail.height")).toBe("키");
  });

  it("has no empty texts in any language", () => {
    for (const language of LANGUAGES) {
      expect(translateOptional(language, "app.title")).toBeTruthy();
      expect(translateOptional(language, "list.noFavorites")).toBeTruthy();
    }
  });

  it("translates type and region slugs", () => {
    expect(translateOptional("nl", "type.fire")).toBe("Vuur");
    expect(translateOptional("de", "type.grass")).toBe("Pflanze");
    expect(translateOptional("ja", "type.electric")).toBe("でんき");
    expect(translateOptional("ja", "region.kanto")).toBe("カントー");
    expect(translateOptional("es", "type.fire")).toBe("Fuego");
    expect(translateOptional("it", "region.unova")).toBe("Unima");
    expect(translateOptional("ko", "type.psychic")).toBe("에스퍼");
    expect(translateOptional("fr", "region.unova")).toBe("Unys");
    expect(translateOptional("de", "region.unova")).toBe("Einall");
  });

  it("returns null for unknown slugs", () => {
    expect(translateOptional("nl", "type.shadow")).toBeNull();
  });
});
