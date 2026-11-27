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

  it("translates the general ability effect label in every language", () => {
    expect(translate("nl", "detail.abilityEffect")).toBe("Algemeen effect");
    expect(translate("en", "detail.abilityEffect")).toBe("General effect");
    expect(translate("de", "detail.abilityEffect")).toBe("Allgemeiner Effekt");
    expect(translate("fr", "detail.abilityEffect")).toBe("Effet général");
    expect(translate("ja", "detail.abilityEffect")).toBe("一般的な効果");
    expect(translate("es", "detail.abilityEffect")).toBe("Efecto general");
    expect(translate("it", "detail.abilityEffect")).toBe("Effetto generale");
    expect(translate("ko", "detail.abilityEffect")).toBe("일반 효과");
  });

  it("translates the game ability description label in every language", () => {
    expect(translate("nl", "detail.gameDescription")).toBe("Spelbeschrijving");
    expect(translate("en", "detail.gameDescription")).toBe("Game description");
    expect(translate("de", "detail.gameDescription")).toBe("Spielbeschreibung");
    expect(translate("fr", "detail.gameDescription")).toBe("Description du jeu");
    expect(translate("ja", "detail.gameDescription")).toBe("ゲーム内説明");
    expect(translate("es", "detail.gameDescription")).toBe("Descripción del juego");
    expect(translate("it", "detail.gameDescription")).toBe("Descrizione del gioco");
    expect(translate("ko", "detail.gameDescription")).toBe("게임 설명");
  });

  it("provides localized training advice and nature labels in every language", () => {
    for (const language of LANGUAGES) {
      expect(translate(language, "detail.trainingAdvice")).toBeTruthy();
      expect(translate(language, "detail.trainingAdviceSummary")).toBeTruthy();
      expect(translate(language, "detail.offensiveExample")).toBeTruthy();
      expect(translate(language, "detail.defensiveExample")).toBeTruthy();
      expect(translate(language, "detail.recommendedNature")).toBeTruthy();
      expect(translate(language, "detail.natureRaises")).toBeTruthy();
      expect(translate(language, "detail.natureLowers")).toBeTruthy();
      expect(translate(language, "detail.evs")).toBeTruthy();
      expect(translate(language, "detail.level100Stats")).toBeTruthy();
      expect(translate(language, "detail.level100Stats")).toContain("{level}");
      expect(translate(language, "detail.calculatedLevel")).toBeTruthy();
      expect(translate(language, "detail.showLevel100Stats")).toBeTruthy();
      expect(translate(language, "detail.showEvValues")).toBeTruthy();
      expect(translate(language, "detail.level100StatAssumptions")).toBeTruthy();
      expect(translate(language, "detail.unavailableStat")).toBeTruthy();
      expect(translate(language, "detail.suggestedMoves")).toBeTruthy();
      expect(translate(language, "detail.suggestedMovesLoading")).toBeTruthy();
      expect(translate(language, "detail.suggestedMovesError")).toBeTruthy();
      expect(translate(language, "detail.noSuggestedMoves")).toBeTruthy();
      expect(translate(language, "detail.trainingAdviceCaveat")).toBeTruthy();
      expect(translate(language, "detail.trainingAdviceMoreInfo")).toBeTruthy();
      expect(translate(language, "detail.noTrainingAdvice")).toBeTruthy();
      expect(translate(language, "nature.adamant")).toBeTruthy();
      expect(translate(language, "nature.bold")).toBeTruthy();
      expect(translate(language, "nature.calm")).toBeTruthy();
      expect(translate(language, "nature.careful")).toBeTruthy();
      expect(translate(language, "nature.impish")).toBeTruthy();
      expect(translate(language, "nature.jolly")).toBeTruthy();
      expect(translate(language, "nature.modest")).toBeTruthy();
      expect(translate(language, "nature.timid")).toBeTruthy();
    }

    expect(translate("nl", "nature.adamant")).toBe("Adamant");
    expect(translate("en", "nature.adamant")).toBe("Adamant");
    expect(translate("en", "detail.suggestedMoves")).toBe("Suggested moves");
  });

  it("provides localized matchup explanations and damage labels", () => {
    expect(translate("nl", "matchup.offenseDescription")).toContain("eigen Pokémon-types");
    expect(translate("en", "matchup.offenseDescription")).toContain("own types");
    expect(translate("de", "matchup.defenseDescription")).toContain("Schaden");
    expect(translate("fr", "matchup.defenseDescription")).toContain("Dégâts");
    expect(translate("ja", "matchup.defenseHeading")).toBe("防御");
    expect(translate("es", "matchup.defenseWeak")).toBe("Recibe más daño de");
    expect(translate("it", "matchup.defenseWeak")).toBe("Subisce più danni da");
    expect(translate("ko", "matchup.defenseWeak")).toBe("더 큰 피해를 받는 타입");

    for (const language of LANGUAGES) {
      expect(translate(language, "matchup.attacks")).toBeTruthy();
      expect(translate(language, "matchup.attackStrong")).toBeTruthy();
      expect(translate(language, "matchup.defenseHeading")).toBeTruthy();
      expect(translate(language, "matchup.defenseImmune")).toBeTruthy();
      expect(translate(language, "matchup.multiplierLegend")).toBeTruthy();
    }
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
